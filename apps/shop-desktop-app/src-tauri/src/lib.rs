use serde::{Deserialize, Serialize};
use serde_json::json;
use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::Mutex;
use tauri::Manager;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrinterInfo {
    pub id: String,
    pub name: String,
    pub status: String,
    pub is_default: bool,
    pub supports_color: bool,
    pub supports_duplex: bool,
    pub queue_count: i32,
}

#[derive(Debug, Deserialize)]
struct PrintersListResponse {
    printers: Vec<PrinterInfo>,
}

#[derive(Debug, Deserialize)]
struct PrintTestResponse {
    ok: bool,
    #[serde(default, rename = "messageAr")]
    message_ar: Option<String>,
}

struct PrintWorkerState {
    path: PathBuf,
}

fn resolve_worker_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if let Ok(p) = std::env::var("PRINT_WORKER_PATH") {
        let path = PathBuf::from(p);
        if path.exists() {
            return Ok(path);
        }
    }

    // Dev: apps/print-worker/bin/Release/net8.0-windows/print-worker.exe
    // relative to src-tauri cwd during `tauri dev`
    let candidates = [
        PathBuf::from("../print-worker/bin/Release/net8.0-windows/print-worker.exe"),
        PathBuf::from("../../print-worker/bin/Release/net8.0-windows/print-worker.exe"),
        PathBuf::from("binaries/print-worker.exe"),
    ];

    for c in &candidates {
        if c.exists() {
            return Ok(c.canonicalize().unwrap_or_else(|_| c.clone()));
        }
    }

    if let Ok(resource) = app.path().resource_dir() {
        let bundled = resource.join("print-worker.exe");
        if bundled.exists() {
            return Ok(bundled);
        }
        // Nested resource path from tauri.conf.json
        let nested = resource
            .join("print-worker")
            .join("bin")
            .join("Release")
            .join("net8.0-windows")
            .join("print-worker.exe");
        if nested.exists() {
            return Ok(nested);
        }
    }

    Err(
        "لم يتم العثور على print-worker. شغّل: npm run worker:build --workspace=@omsp/shop-desktop-app"
            .into(),
    )
}

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

#[cfg(windows)]
fn call_worker(worker: &PathBuf, request: serde_json::Value) -> Result<serde_json::Value, String> {
    let mut child = Command::new(worker)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|e| format!("تعذر تشغيل عامل الطباعة: {e}"))?;

    {
        let stdin = child
            .stdin
            .as_mut()
            .ok_or_else(|| "stdin غير متاح".to_string())?;
        let line = format!("{}\n", request);
        stdin
            .write_all(line.as_bytes())
            .map_err(|e| format!("فشل إرسال الأمر: {e}"))?;
    }
    drop(child.stdin.take());

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "stdout غير متاح".to_string())?;
    let mut reader = BufReader::new(stdout);
    let mut response_line = String::new();
    reader
        .read_line(&mut response_line)
        .map_err(|e| format!("فشل قراءة الرد: {e}"))?;

    let _ = child.wait();

    if response_line.trim().is_empty() {
        return Err("عامل الطباعة لم يُرجع رداً".into());
    }

    serde_json::from_str(response_line.trim())
        .map_err(|e| format!("رد غير صالح من عامل الطباعة: {e}"))
}

#[tauri::command]
fn list_printers(app: tauri::AppHandle, state: tauri::State<'_, Mutex<Option<PrintWorkerState>>>) -> Result<Vec<PrinterInfo>, String> {
    let path = {
        let mut guard = state.lock().map_err(|_| "قفل الحالة فشل")?;
        if guard.is_none() {
            *guard = Some(PrintWorkerState {
                path: resolve_worker_path(&app)?,
            });
        }
        guard.as_ref().unwrap().path.clone()
    };

    #[cfg(windows)]
    {
        let value = call_worker(&path, json!({ "cmd": "printers.list" }))?;
        let parsed: PrintersListResponse = serde_json::from_value(value)
            .map_err(|e| format!("تعذر تحليل قائمة الطابعات: {e}"))?;
        Ok(parsed.printers)
    }

    #[cfg(not(windows))]
    {
        let _ = path;
        Err("الطباعة مدعومة على Windows فقط".into())
    }
}

/// Native save dialog + write (browser downloads do not work in Tauri WebView).
#[tauri::command]
fn save_export_file(
    default_name: String,
    contents: String,
    filter_name: String,
    extensions: Vec<String>,
) -> Result<Option<String>, String> {
    let ext_refs: Vec<&str> = extensions.iter().map(String::as_str).collect();
    let Some(path) = rfd::FileDialog::new()
        .set_file_name(&default_name)
        .add_filter(&filter_name, &ext_refs)
        .save_file()
    else {
        return Ok(None);
    };

    std::fs::write(&path, contents.as_bytes())
        .map_err(|e| format!("تعذر حفظ الملف: {e}"))?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

/// Write report HTML to cache and open with the system default app (print → PDF).
#[tauri::command]
fn open_html_report(app: tauri::AppHandle, contents: String) -> Result<String, String> {
    use tauri_plugin_opener::OpenerExt;

    let dir = app
        .path()
        .app_cache_dir()
        .or_else(|_| app.path().temp_dir())
        .map_err(|e| format!("تعذر تحديد مجلد مؤقت: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("تعذر إنشاء المجلد: {e}"))?;

    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let path = dir.join(format!("omsp-report-{stamp}.html"));
    std::fs::write(&path, contents.as_bytes())
        .map_err(|e| format!("تعذر كتابة التقرير: {e}"))?;

    let path_str = path.to_string_lossy().into_owned();
    app.opener()
        .open_path(&path_str, None::<&str>)
        .map_err(|e| format!("تعذر فتح التقرير: {e}"))?;
    Ok(path_str)
}

#[tauri::command]
fn print_test(
    app: tauri::AppHandle,
    state: tauri::State<'_, Mutex<Option<PrintWorkerState>>>,
    printer_id: String,
) -> Result<(), String> {
    let path = {
        let mut guard = state.lock().map_err(|_| "قفل الحالة فشل")?;
        if guard.is_none() {
            *guard = Some(PrintWorkerState {
                path: resolve_worker_path(&app)?,
            });
        }
        guard.as_ref().unwrap().path.clone()
    };

    #[cfg(windows)]
    {
        let value = call_worker(
            &path,
            json!({ "cmd": "print.test", "printerId": printer_id }),
        )?;
        let parsed: PrintTestResponse = serde_json::from_value(value)
            .map_err(|e| format!("تعذر تحليل رد الطباعة: {e}"))?;
        if parsed.ok {
            Ok(())
        } else {
            Err(parsed
                .message_ar
                .unwrap_or_else(|| "فشلت طباعة الاختبار".into()))
        }
    }

    #[cfg(not(windows))]
    {
        let _ = (path, printer_id);
        Err("الطباعة مدعومة على Windows فقط".into())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(None::<PrintWorkerState>))
        .invoke_handler(tauri::generate_handler![
            list_printers,
            print_test,
            save_export_file,
            open_html_report
        ])
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.maximize();
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
