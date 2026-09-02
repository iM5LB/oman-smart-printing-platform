import { useCallback, useEffect, useState } from "react";
import { listPrinters, printTest, type PrinterInfo } from "../lib/print";
import { Badge, Button, EmptyState, Panel } from "../components/ui";
import { Icons } from "../components/icons";
import { CountPill, PageHeading } from "../components/PageHeading";
import { printerStatusAr, printerStatusTone } from "../lib/labels";

export function PrintersPage() {
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listPrinters();
      setPrinters(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر قراءة الطابعات");
      setPrinters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const onTest = async (printer: PrinterInfo) => {
    setBusyId(printer.id);
    setToast(null);
    try {
      await printTest(printer.id);
      setToast(`تم إرسال صفحة اختبار إلى ${printer.name}`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "فشلت طباعة الاختبار");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="page-fit">
      <PageHeading
        icon={Icons.printer({ size: 22 })}
        title="الطابعات"
        description="الطابعات المثبتة على Windows"
        actions={
          <>
            <CountPill value={printers.length} label="جهاز" />
            <Button variant="secondary" onClick={() => void refresh()} disabled={loading}>
              تحديث
            </Button>
          </>
        }
      />

      {toast ? (
        <Panel className="shrink-0 px-3 py-2 text-body text-text-secondary">{toast}</Panel>
      ) : null}

      <div className="scroll-y min-h-0 flex-1">
        {loading ? (
          <EmptyState title="جاري اكتشاف الطابعات..." />
        ) : error ? (
          <EmptyState title="تعذر الاتصال بعامل الطباعة" detail={error} />
        ) : printers.length === 0 ? (
          <EmptyState
            title="لا توجد طابعات"
            detail="ثبّت طابعة في Windows ثم اضغط تحديث."
          />
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {printers.map((p) => (
              <Panel key={p.id} className="p-3.5">
                <div className="flex items-start gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-bg-elevated text-text-secondary">
                    {Icons.printer({ size: 18 })}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-medium" dir="ltr">
                      {p.name}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      <Badge tone={printerStatusTone(p.status)}>{printerStatusAr(p.status)}</Badge>
                      {p.isDefault ? <Badge tone="info">افتراضية</Badge> : null}
                      {p.supportsColor ? <Badge>ألوان</Badge> : <Badge>أبيض وأسود</Badge>}
                      {p.supportsDuplex ? <Badge>وجهين</Badge> : null}
                    </div>
                    <p className="mt-2 text-meta text-text-muted">
                      طابور: {p.queueCount}
                    </p>
                  </div>
                </div>
                <Button
                  className="mt-3 w-full"
                  variant="primary"
                  disabled={busyId === p.id}
                  onClick={() => void onTest(p)}
                >
                  {busyId === p.id ? "جاري الإرسال..." : "طباعة اختبار"}
                </Button>
              </Panel>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
