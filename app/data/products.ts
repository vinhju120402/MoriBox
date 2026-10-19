// Store-wide category nav. MoriBox only sells Bandai Gunpla model kits, so
// categories reflect the two real ways the catalog is organized: by Grade
// and by Series. Each id is prefixed so the catalog filter can tell them
// apart without a separate lookup table.
export interface CategoryLink {
  id: string;
  label: string;
}

export const GRADE_CATEGORIES: CategoryLink[] = [
  { id: 'grade:PG', label: 'Perfect Grade (PG)' },
  { id: 'grade:MG', label: 'Master Grade (MG)' },
  { id: 'grade:RG', label: 'Real Grade (RG)' },
  { id: 'grade:HG', label: 'High Grade (HG)' },
  { id: 'grade:EG', label: 'Entry Grade (EG)' },
  { id: 'grade:SD', label: 'Super Deformed (SD)' },
  { id: 'grade:ACC', label: 'Phụ kiện' },
];

// 'ACC' (accessories — stands, tools, paint, diorama pieces) isn't a real
// Gunpla grade, but it reuses the grade categorization/routing so it gets a
// sidebar entry and a /danh-muc/acc page for free.
export type GradeCode = 'PG' | 'MG' | 'RG' | 'HG' | 'EG' | 'SD' | 'ACC';

export interface GradeInfo {
  code: GradeCode;
  label: string;
  scale: string;
  parts: string;
  diff: string;
  desc: string;
}

// Shared grade metadata, used by the /danh-muc/[grade] category pages.
export const GRADE_INFO: GradeInfo[] = [
  {
    code: 'PG', label: 'Perfect Grade',
    scale: '1/60 · ~30 cm', parts: '500+', diff: 'Chuyên gia',
    desc: 'Dòng mô hình lớn nhất với hệ thống cơ xương phức tạp, khung kim loại và chi tiết siêu thực tế.',
  },
  {
    code: 'MG', label: 'Master Grade',
    scale: '1/100 · ~18 cm', parts: '300+', diff: 'Nâng cao',
    desc: 'Cân bằng hoàn hảo giữa kích thước và độ chi tiết với khung xương nội thất đầy đủ.',
  },
  {
    code: 'RG', label: 'Real Grade',
    scale: '1/144 · ~13 cm', parts: '250+', diff: 'Trung bình',
    desc: 'Nhỏ gọn nhưng chi tiết đỉnh cao nhờ công nghệ khớp đúc sẵn đột phá.',
  },
  {
    code: 'HG', label: 'High Grade',
    scale: '1/144 · ~13 cm', parts: '150+', diff: 'Cơ bản',
    desc: 'Điểm khởi đầu tuyệt vời cho builder mới: nhanh, vui, giá hợp lý.',
  },
  {
    code: 'EG', label: 'Entry Grade',
    scale: '1/144 · ~13 cm', parts: '60+', diff: 'Người mới',
    desc: 'Lắp ráp không cần sơn hay keo, khớp chuyển động linh hoạt, giá tốt nhất cho người mới bắt đầu.',
  },
  {
    code: 'SD', label: 'Super Deformed',
    scale: 'Non-scale · ~8 cm', parts: '90+', diff: 'Cơ bản',
    desc: 'Tỷ lệ đầu to đặc trưng, nhỏ gọn dễ thương, phù hợp sưu tầm và trưng bày theo bộ.',
  },
  {
    code: 'ACC', label: 'Phụ kiện',
    scale: 'Đa dạng', parts: 'Đa dạng', diff: 'Phổ thông',
    desc: 'Đế trưng bày, dụng cụ lắp ráp, sơn màu và phụ kiện trang trí cho bộ sưu tập Gunpla của bạn.',
  },
];

export interface Product {
  id: string;
  name: string;
  grade: GradeCode;
  scale: string;
  series: string;
  price: number;
  /** Discounted price for a limited-time flash sale. Presence of this field marks the product as on sale. */
  salePrice?: number;
  image: string;
  /** Extra gallery photos beyond the cover `image` (admin upload/capture, up to 5 total). */
  images?: string[];
  stock: number;
  /** Stock level at or below which the product counts as "sắp hết" (default 5). */
  lowStockThreshold?: number;
  isNew: boolean;
  isBestSeller: boolean;
  specs: {
    height: string;
    partsCount: number;
    difficulty: string;
    weaponList: string[];
  };
  description: string;
}

export const DEFAULT_LOW_STOCK = 5;
export const lowStockLevel = (p: Pick<Product, 'lowStockThreshold'>) => p.lowStockThreshold ?? DEFAULT_LOW_STOCK;

export const PRODUCTS: Product[] = [
  {
    id: 'rx-78-2',
    name: 'RX-78-2 Gundam (Ver. Anime)',
    grade: 'PG',
    scale: '1/60',
    series: 'Mobile Suit Gundam',
    price: 4500000,
    image: '/images/rx782.png',
    stock: 6,
    isNew: false,
    isBestSeller: true,
    specs: {
      height: '30 cm',
      partsCount: 650,
      difficulty: 'Expert',
      weaponList: ['Beam Rifle', 'Beam Saber x2', 'Hyper Bazooka', 'Shield']
    },
    description: 'Mô hình Gundam huyền thoại RX-78-2 phiên bản Perfect Grade siêu chi tiết với hệ thống khớp linh hoạt và khung xương kim loại mô phỏng chân thực.'
  },
  {
    id: 'gn-001-exia',
    name: 'Gundam Exia',
    grade: 'MG',
    scale: '1/100',
    series: 'Gundam 00',
    price: 1250000,
    image: '/images/exia.png',
    stock: 14,
    isNew: true,
    isBestSeller: false,
    specs: {
      height: '18 cm',
      partsCount: 380,
      difficulty: 'Intermediate',
      weaponList: ['GN Sword', 'GN Long Blade', 'GN Short Blade', 'GN Shield']
    },
    description: 'Mobile Suit cận chiến thế hệ thứ ba của Celestial Being, được trang bị lò phản ứng GN Drive nguyên bản cực kỳ mạnh mẽ.'
  },
  {
    id: 'rx-0-unicorn',
    name: 'Unicorn Gundam (Destroy Mode)',
    grade: 'RG',
    scale: '1/144',
    series: 'Gundam Unicorn',
    price: 950000,
    image: '/images/unicorn.png',
    stock: 23,
    isNew: true,
    isBestSeller: false,
    specs: {
      height: '13.5 cm',
      partsCount: 320,
      difficulty: 'Advanced',
      weaponList: ['Beam Magnum', 'Hyper Bazooka', 'Beam Saber x4', 'Shield']
    },
    description: 'Phiên bản Real Grade đột phá với khả năng chuyển đổi chi tiết giáp và lớp Psycho-Frame phản quang ấn tượng.'
  },
  {
    id: 'asw-g-08-barbatos',
    name: 'Gundam Barbatos Lupus Rex',
    grade: 'HG',
    scale: '1/144',
    series: 'Iron-Blooded Orphans',
    price: 480000,
    image: '/images/barbatos.svg',
    stock: 0,
    isNew: false,
    isBestSeller: false,
    specs: {
      height: '13 cm',
      partsCount: 180,
      difficulty: 'Beginner',
      weaponList: ['Ultra Large Mace', 'Rex Nail', 'Tail Blade', 'Sub-Arm x2']
    },
    description: 'Dạng thức tối thượng của Barbatos với móng vuốt cỡ lớn và đuôi kim loại điều khiển linh hoạt bằng hệ thống Alaya-Vijnana.'
  },
  {
    id: 'eg-rx-78-2',
    name: 'EG RX-78-2 Gundam',
    grade: 'EG',
    scale: '1/144',
    series: 'Mobile Suit Gundam',
    price: 250000,
    salePrice: 189000,
    image: '/images/eg-rx782.svg',
    stock: 31,
    isNew: true,
    isBestSeller: false,
    specs: {
      height: '13 cm',
      partsCount: 60,
      difficulty: 'Beginner',
      weaponList: ['Beam Rifle', 'Beam Saber', 'Shield']
    },
    description: 'Dòng Entry Grade lắp ráp không cần sơn hay keo, khớp chuyển động linh hoạt, điểm khởi đầu lý tưởng cho người mới hoàn toàn.'
  },
  {
    id: 'sd-cross-silhouette-freedom',
    name: 'SD Gundam Cross Silhouette Freedom Gundam',
    grade: 'SD',
    scale: 'Non-scale',
    series: 'Mobile Suit Gundam SEED',
    price: 320000,
    image: '/images/sd-freedom.svg',
    stock: 18,
    isNew: false,
    isBestSeller: true,
    specs: {
      height: '8 cm',
      partsCount: 90,
      difficulty: 'Beginner',
      weaponList: ['Beam Rifle x2', 'Beam Saber x2', 'Railgun x2']
    },
    description: 'Phiên bản chibi tỷ lệ đầu to đặc trưng dòng Cross Silhouette, tương thích khung xương với các mô hình SD khác cùng dòng.'
  },
  {
    id: 'pg-unicorn-gundam',
    name: 'Unicorn Gundam (Perfect Grade)',
    grade: 'PG',
    scale: '1/60',
    series: 'Gundam Unicorn',
    price: 6800000,
    image: '/images/pg-unicorn.svg',
    stock: 4,
    isNew: false,
    isBestSeller: false,
    specs: {
      height: '40 cm',
      partsCount: 900,
      difficulty: 'Expert',
      weaponList: ['Beam Magnum', 'Beam Saber x2', 'Armed Armor DE', 'Shield']
    },
    description: 'Phiên bản Perfect Grade với hệ thống LED phát sáng thật cho Psycho-Frame và cơ chế chuyển đổi Destroy Mode hoàn toàn tự động.'
  },
  {
    id: 'mg-strike-freedom',
    name: 'Strike Freedom Gundam',
    grade: 'MG',
    scale: '1/100',
    series: 'Mobile Suit Gundam SEED Destiny',
    price: 1850000,
    salePrice: 1490000,
    image: '/images/mg-strike-freedom.svg',
    stock: 9,
    isNew: true,
    isBestSeller: false,
    specs: {
      height: '21 cm',
      partsCount: 400,
      difficulty: 'Advanced',
      weaponList: ['Beam Rifle x2', 'Railgun x2', 'Beam Saber x2', 'DRAGOON x8']
    },
    description: 'Mobile Suit chỉ huy thế hệ mới của ZAFT, trang bị hệ thống DRAGOON điều khiển từ xa và hỏa lực áp đảo.'
  },
  {
    id: 'rg-zaku-ii',
    name: 'Zaku II Char Custom',
    grade: 'RG',
    scale: '1/144',
    series: 'Mobile Suit Gundam',
    price: 890000,
    salePrice: 690000,
    image: '/images/rg-zaku2.svg',
    stock: 16,
    isNew: false,
    isBestSeller: false,
    specs: {
      height: '13.6 cm',
      partsCount: 220,
      difficulty: 'Intermediate',
      weaponList: ['Heat Hawk', 'Zaku Machine Gun', 'Shield']
    },
    description: 'Phiên bản Real Grade của mẫu Mobile Suit huyền thoại phe Zeon, tốc độ nhanh hơn ba lần so với Zaku II tiêu chuẩn.'
  },
  {
    id: 'hg-gundam-aerial',
    name: 'Gundam Aerial',
    grade: 'HG',
    scale: '1/144',
    series: 'Mobile Suit Gundam: The Witch from Mercury',
    price: 550000,
    image: '/images/hg-aerial.svg',
    stock: 21,
    isNew: true,
    isBestSeller: false,
    specs: {
      height: '13 cm',
      partsCount: 170,
      difficulty: 'Beginner',
      weaponList: ['GUND-ARM Sword x2', 'Beam Saber', 'Shield']
    },
    description: 'Mobile Suit gắn liền với hệ thống GUND Format và bộ giáp Permet Score cao, nổi bật với đôi cánh Aerial đặc trưng.'
  },
  {
    id: 'eg-strike-gundam',
    name: 'EG Strike Gundam',
    grade: 'EG',
    scale: '1/144',
    series: 'Mobile Suit Gundam SEED',
    price: 260000,
    image: '/images/eg-strike.svg',
    stock: 27,
    isNew: false,
    isBestSeller: false,
    specs: {
      height: '13 cm',
      partsCount: 65,
      difficulty: 'Beginner',
      weaponList: ['Beam Rifle', 'Beam Saber', 'Shield']
    },
    description: 'Phiên bản Entry Grade của Mobile Suit đa năng đầu tiên của Liên quân Earth, lắp ráp nhanh không cần sơn hay keo.'
  },
  {
    id: 'sd-ex-standard-wing-zero',
    name: 'SD EX-Standard Wing Gundam Zero',
    grade: 'SD',
    scale: 'Non-scale',
    series: 'New Mobile Report Gundam Wing',
    price: 300000,
    salePrice: 229000,
    image: '/images/sd-wing-zero.svg',
    stock: 14,
    isNew: false,
    isBestSeller: false,
    specs: {
      height: '8 cm',
      partsCount: 80,
      difficulty: 'Beginner',
      weaponList: ['Twin Buster Rifle', 'Beam Saber x2']
    },
    description: 'Phiên bản chibi dòng EX-Standard của Mobile Suit sở hữu sức mạnh hủy diệt hàng đầu vũ trụ Sau Chiến tranh Thuộc địa.'
  },
  {
    id: 'display-stand-universal',
    name: 'Đế trưng bày xoay 360°',
    grade: 'ACC',
    scale: 'Universal',
    series: 'Đế trưng bày',
    price: 150000,
    image: '/images/display-stand.svg',
    stock: 40,
    isNew: true,
    isBestSeller: false,
    specs: {
      height: 'Nhựa ABS cao cấp',
      partsCount: 1,
      difficulty: 'Phổ thông',
      weaponList: []
    },
    description: 'Đế xoay 360 độ giúp trưng bày mô hình Gunpla sinh động, tương thích mọi tỷ lệ từ HG đến PG.'
  },
  {
    id: 'tool-kit-6pcs',
    name: 'Bộ dụng cụ lắp ráp 6 món',
    grade: 'ACC',
    scale: 'Bộ 6 món',
    series: 'Dụng cụ lắp ráp',
    price: 320000,
    image: '/images/tool-kit.svg',
    stock: 25,
    isNew: false,
    isBestSeller: true,
    specs: {
      height: 'Thép không gỉ',
      partsCount: 6,
      difficulty: 'Phổ thông',
      weaponList: []
    },
    description: 'Bộ kìm cắt, dũa, nhíp và dao gọt chuyên dụng giúp tỉa nhựa và hoàn thiện mô hình không để lại vết cắt.'
  },
  {
    id: 'paint-set-12-colors',
    name: 'Bộ sơn mô hình 12 màu',
    grade: 'ACC',
    scale: '12 màu',
    series: 'Sơn màu mô hình',
    price: 450000,
    image: '/images/paint-set.svg',
    stock: 18,
    isNew: true,
    isBestSeller: false,
    specs: {
      height: 'Sơn gốc nước, không mùi',
      partsCount: 12,
      difficulty: 'Phổ thông',
      weaponList: []
    },
    description: 'Bộ 12 màu sơn acrylic cơ bản, an toàn và dễ pha, phù hợp cho người mới bắt đầu tô màu chi tiết Gunpla.'
  },
  {
    id: 'diorama-base-set',
    name: 'Set nền diorama chiến trường',
    grade: 'ACC',
    scale: 'Set 3 món',
    series: 'Đồ trang trí',
    price: 280000,
    image: '/images/diorama-base.svg',
    stock: 12,
    isNew: false,
    isBestSeller: false,
    specs: {
      height: 'Nhựa PVC',
      partsCount: 3,
      difficulty: 'Phổ thông',
      weaponList: []
    },
    description: 'Nền trưng bày phong cách chiến trường giúp mô hình Gunpla của bạn thêm phần ấn tượng khi chụp ảnh.'
  }
];
