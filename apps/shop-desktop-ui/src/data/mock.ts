export type OrderStatus =
  | 'review_pending'
  | 'queued'
  | 'printing'
  | 'ready'
  | 'collected'
  | 'needs_review'
  | 'failed';

export type PaymentStatus = 'paid' | 'unpaid' | 'pending';

export type MockOrder = {
  id: string;
  number: string;
  customer: string;
  phone: string;
  status: OrderStatus;
  payment: PaymentStatus;
  totalBaisa: number;
  pages: number;
  files: string[];
  printer: string | null;
  createdAt: string;
  notes?: string;
  color: 'bw' | 'color';
  duplex: boolean;
  copies: number;
};

export type MockPrinter = {
  id: string;
  name: string;
  status: 'ready' | 'printing' | 'offline' | 'paper' | 'error';
  queue: number;
  caps: string[];
  job?: string;
};

export const STATUS_AR: Record<OrderStatus, string> = {
  review_pending: 'قيد المراجعة',
  queued: 'بانتظار الطباعة',
  printing: 'جاري الطباعة',
  ready: 'جاهز للاستلام',
  collected: 'تم التسليم',
  needs_review: 'يحتاج مراجعة',
  failed: 'فشل',
};

export const PAYMENT_AR: Record<PaymentStatus, string> = {
  paid: 'مدفوع',
  unpaid: 'غير مدفوع',
  pending: 'بانتظار الدفع',
};

export const KPIS = [
  { key: 'orders', label: 'طلبات اليوم', value: '48', delta: '+12%', tone: 'accent' as const },
  { key: 'revenue', label: 'الإيرادات اليوم', value: '86.400 ر.ع', delta: '+8%', tone: 'ok' as const },
  { key: 'printing', label: 'قيد الطباعة', value: '5', delta: '', tone: 'warn' as const },
  { key: 'ready', label: 'جاهزة للاستلام', value: '11', delta: '', tone: 'ok' as const },
  { key: 'unpaid', label: 'غير مدفوعة', value: '7', delta: '', tone: 'danger' as const },
  { key: 'review', label: 'تحتاج مراجعة', value: '2', delta: '', tone: 'warn' as const },
];

export const ORDERS: MockOrder[] = [
  {
    id: '1',
    number: '#124',
    customer: 'سعيد الحارثي',
    phone: '+96891234567',
    status: 'printing',
    payment: 'paid',
    totalBaisa: 1700,
    pages: 20,
    files: ['تقرير-project-v2.pdf'],
    printer: 'HP LaserJet M404dn',
    createdAt: 'اليوم 10:32 ص',
    notes: 'يرجى تدبيس النسختين بشكل منفصل.',
    color: 'bw',
    duplex: true,
    copies: 2,
  },
  {
    id: '2',
    number: '#125',
    customer: 'أحمد البلوشي',
    phone: '+96892555111',
    status: 'ready',
    payment: 'unpaid',
    totalBaisa: 1250,
    pages: 8,
    files: ['شهادة.pdf'],
    printer: 'Brother HL-L2350',
    createdAt: 'اليوم 10:18 ص',
    color: 'bw',
    duplex: false,
    copies: 1,
  },
  {
    id: '3',
    number: '#126',
    customer: 'مريم الكندي',
    phone: '+96899112233',
    status: 'queued',
    payment: 'paid',
    totalBaisa: 3200,
    pages: 42,
    files: ['عرض-تقديمي.pdf', 'ملحق.pdf'],
    printer: null,
    createdAt: 'اليوم 09:55 ص',
    color: 'color',
    duplex: true,
    copies: 1,
  },
  {
    id: '4',
    number: '#127',
    customer: 'خالد الشامسي',
    phone: '+96897778899',
    status: 'needs_review',
    payment: 'paid',
    totalBaisa: 4800,
    pages: 6,
    files: ['ملصق-A3.pdf'],
    printer: null,
    createdAt: 'اليوم 09:40 ص',
    notes: 'A3 ألوان — لا توجد طابعة متوافقة.',
    color: 'color',
    duplex: false,
    copies: 4,
  },
  {
    id: '5',
    number: '#128',
    customer: 'فاطمة الزدجالي',
    phone: '+96893334455',
    status: 'review_pending',
    payment: 'pending',
    totalBaisa: 900,
    pages: 12,
    files: ['ملاحظات.pdf'],
    printer: null,
    createdAt: 'اليوم 09:12 ص',
    color: 'bw',
    duplex: true,
    copies: 1,
  },
  {
    id: '6',
    number: '#123',
    customer: 'يوسف الهنائي',
    phone: '+96894445566',
    status: 'collected',
    payment: 'paid',
    totalBaisa: 2100,
    pages: 30,
    files: ['عقد.pdf'],
    printer: 'HP LaserJet M404dn',
    createdAt: 'اليوم 08:50 ص',
    color: 'bw',
    duplex: true,
    copies: 2,
  },
];

export const PRINTERS: MockPrinter[] = [
  {
    id: 'p1',
    name: 'HP LaserJet M404dn',
    status: 'printing',
    queue: 2,
    caps: ['A4', 'أبيض وأسود', 'وجهين'],
    job: '#124 · تقرير-project-v2.pdf',
  },
  {
    id: 'p2',
    name: 'Brother HL-L2350',
    status: 'ready',
    queue: 0,
    caps: ['A4', 'أبيض وأسود'],
  },
  {
    id: 'p3',
    name: 'Canon imageCLASS',
    status: 'paper',
    queue: 1,
    caps: ['A4', 'A3', 'ألوان'],
  },
  {
    id: 'p4',
    name: 'Epson EcoTank',
    status: 'offline',
    queue: 0,
    caps: ['A4', 'ألوان', 'صور'],
  },
];

export const QUEUE = [
  { id: 'q1', order: '#124', file: 'تقرير-project-v2.pdf', printer: 'HP M404dn', progress: 68, state: 'printing' as const },
  { id: 'q2', order: '#126', file: 'عرض-تقديمي.pdf', printer: '—', progress: 0, state: 'next' as const },
  { id: 'q3', order: '#129', file: 'نماذج.pdf', printer: 'Brother', progress: 0, state: 'next' as const },
  { id: 'q4', order: '#120', file: 'flyer.pdf', printer: 'Canon', progress: 0, state: 'failed' as const },
];

export const ALERTS = [
  { id: 'a1', tone: 'danger' as const, text: 'Canon imageCLASS — لا يوجد ورق' },
  { id: 'a2', tone: 'warn' as const, text: 'الطلب #127 يحتاج مراجعة (لا طابعة متوافقة)' },
  { id: 'a3', tone: 'accent' as const, text: 'طلب جديد #128 بانتظار المراجعة' },
];
