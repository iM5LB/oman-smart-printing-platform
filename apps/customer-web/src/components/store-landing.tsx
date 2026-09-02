'use client';

import { useState } from 'react';
import type { StorePublicInfo } from '@omsp/types';
import { FileUploadZone } from '@/components/file-upload-zone';
import { StoreFooter } from '@/components/store-footer';
import { StoreNavbar } from '@/components/store-navbar';
import type { SelectedFile } from '@/lib/files';

interface StoreLandingProps {
  store: StorePublicInfo;
}

export function StoreLanding({ store }: StoreLandingProps) {
  const [files, setFiles] = useState<SelectedFile[]>([]);

  return (
    <div className="page-shell">
      <div className="page-content animate-fade-in">
        <StoreNavbar store={store} />

        <div className="page-body px-4 pb-4">
          <div className="animate-fade-in-up animate-delay-1 mb-5 text-center">
            <h2 className="text-2xl font-bold leading-snug text-text">
              اطبع ملفاتك بسهولة
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-text-muted">
              ارفع ملفاتك، اختر إعدادات الطباعة، وراح تكون جاهزة عند وصولك
            </p>
          </div>

          {!store.is_open && (
            <p className="animate-fade-in-up animate-delay-2 mb-4 text-center text-sm text-warning">
              المكتبة مغلقة حالياً — يمكنك تقديم طلبك وسيتم تجهيزه عند الفتح
            </p>
          )}

          <div className="animate-fade-in-up animate-delay-2">
            <FileUploadZone files={files} onFilesChange={setFiles} />
          </div>
        </div>

        <StoreFooter store={store} />
      </div>
    </div>
  );
}
