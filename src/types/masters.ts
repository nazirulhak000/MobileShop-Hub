export interface MasterCategory {
  id: string;
  code: string;
  name: string;
  description: string;
  badge?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface MasterBrand {
  id: string;
  name: string;
  country: string;
  deviceCount: number;
  popular: boolean;
  badge?: string;
  displayOrder: number;
}

export interface MasterModel {
  id: string;
  brandName: string;
  modelName: string;
  series: string;
  year: number;
  screenSize: string;
  popular?: boolean;
  badge?: string;
  displayOrder: number;
}

export interface MasterCommonSymptom {
  id: string;
  name: string;
  description: string;
  baseLaborFee: number;
  estimatedHours: number;
  priority: "HIGH" | "MEDIUM" | "NORMAL";
  badge?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface MasterService {
  id: string;
  code: string;
  name: string;
  description: string;
  standardPrice: number;
  estimatedMinutes: number;
  badge?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface MasterStorageCapacity {
  id: string;
  capacity: string;
  unit: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
}

export interface MasterColor {
  id: string;
  nameTh: string;
  nameEn: string;
  hexCode: string;
  displayOrder: number;
}

export interface MasterDataStore {
  categories: MasterCategory[];
  brands: MasterBrand[];
  models: MasterModel[];
  symptoms: MasterCommonSymptom[];
  services: MasterService[];
  capacities: MasterStorageCapacity[];
  colors: MasterColor[];
  updatedAt?: string;
}

export const DEFAULT_MASTER_DATA: MasterDataStore = {
  categories: [
    {
      id: "cat-1",
      code: "DEVICE",
      name: "สมาร์ทโฟน & แท็บเล็ต",
      description: "เครื่องพร้อมใช้งาน สมาร์ทโฟนมือสอง และเครื่องเทรดอิน",
      badge: "ยอดนิยม",
      displayOrder: 1,
      isActive: true,
    },
    {
      id: "cat-2",
      code: "ACCESSORY",
      name: "อุปกรณ์เสริม & แก็ดเจ็ต",
      description: "เคสกันกระแทก ฟิล์มกระจก หัวชาร์จ สายชาร์จ หูฟัง",
      badge: "ขายดี",
      displayOrder: 2,
      isActive: true,
    },
    {
      id: "cat-3",
      code: "SPARE_PART",
      name: "อะไหล่ซ่อม & จอ/แบต",
      description: "หน้าจอแท้ศูนย์ แบตเตอรี่ มอก. โมดูลกล้อง แพรชาร์จ",
      badge: "มาตรฐาน มอก.",
      displayOrder: 3,
      isActive: true,
    },
    {
      id: "cat-4",
      code: "SERVICE",
      name: "บริการงานซ่อม & ตรวจเช็ค",
      description: "ค่าบริการช่าง ตรวจวัดกระแสไฟ ยกชิปไอซี และกู้ข้อมูล",
      badge: "รับประกัน 90 วัน",
      displayOrder: 4,
      isActive: true,
    },
  ],

  brands: [
    { id: "b-1", name: "Apple", country: "สหรัฐอเมริกา", deviceCount: 42, popular: true, badge: "Flagship", displayOrder: 1 },
    { id: "b-2", name: "Samsung", country: "เกาหลีใต้", deviceCount: 38, popular: true, badge: "Top Brand", displayOrder: 2 },
    { id: "b-3", name: "Xiaomi", country: "จีน", deviceCount: 26, popular: true, badge: "ยอดนิยม", displayOrder: 3 },
    { id: "b-4", name: "OPPO", country: "จีน", deviceCount: 20, popular: true, badge: "ยอดนิยม", displayOrder: 4 },
    { id: "b-5", name: "Vivo", country: "จีน", deviceCount: 18, popular: true, badge: "ยอดนิยม", displayOrder: 5 },
    { id: "b-6", name: "Realme", country: "จีน", deviceCount: 14, popular: false, badge: "มาแรง", displayOrder: 6 },
    { id: "b-7", name: "Google Pixel", country: "สหรัฐอเมริกา", deviceCount: 8, popular: false, badge: "AI Phone", displayOrder: 7 },
    { id: "b-8", name: "Huawei", country: "จีน", deviceCount: 12, popular: false, badge: "ทนทาน", displayOrder: 8 },
    { id: "b-9", name: "OnePlus", country: "จีน", deviceCount: 9, popular: false, badge: "สเปกแรง", displayOrder: 9 },
  ],

  models: [
    { id: "m-1", brandName: "Apple", modelName: "iPhone 15 Pro Max", series: "iPhone 15 Series", year: 2023, screenSize: '6.7"', popular: true, badge: "เรือธง", displayOrder: 1 },
    { id: "m-2", brandName: "Apple", modelName: "iPhone 15 Pro", series: "iPhone 15 Series", year: 2023, screenSize: '6.1"', popular: true, badge: "เรือธง", displayOrder: 2 },
    { id: "m-3", brandName: "Apple", modelName: "iPhone 15", series: "iPhone 15 Series", year: 2023, screenSize: '6.1"', popular: true, badge: "ยอดนิยม", displayOrder: 3 },
    { id: "m-4", brandName: "Apple", modelName: "iPhone 14 Pro Max", series: "iPhone 14 Series", year: 2022, screenSize: '6.7"', popular: true, badge: "ยอดนิยม", displayOrder: 4 },
    { id: "m-5", brandName: "Apple", modelName: "iPhone 13", series: "iPhone 13 Series", year: 2021, screenSize: '6.1"', popular: true, badge: "ขายดี", displayOrder: 5 },
    { id: "m-6", brandName: "Samsung", modelName: "Galaxy S24 Ultra", series: "Galaxy S24", year: 2024, screenSize: '6.8"', popular: true, badge: "Galaxy AI", displayOrder: 6 },
    { id: "m-7", brandName: "Samsung", modelName: "Galaxy S23 Ultra", series: "Galaxy S23", year: 2023, screenSize: '6.8"', popular: true, badge: "ยอดนิยม", displayOrder: 7 },
    { id: "m-8", brandName: "Xiaomi", modelName: "Xiaomi 14 Ultra", series: "Xiaomi 14", year: 2024, screenSize: '6.73"', popular: true, badge: "Leica Cam", displayOrder: 8 },
    { id: "m-9", brandName: "OPPO", modelName: "Find X7 Ultra", series: "Find Series", year: 2024, screenSize: '6.82"', popular: false, badge: "Hasselblad", displayOrder: 9 },
  ],

  symptoms: [
    {
      id: "sym-1",
      name: "หน้าจอแตก / จอดับ / ทัชเพี้ยน",
      description: "เปลี่ยนชุดหน้าจอแท้ / จอเทียบเกรด AAA พร้อมซีลกันน้ำ IP68 ย้าย True Tone",
      baseLaborFee: 1200,
      estimatedHours: 1.5,
      priority: "HIGH",
      badge: "ด่วน / บ่อยสุด",
      displayOrder: 1,
      isActive: true,
    },
    {
      id: "sym-2",
      name: "แบตเตอรี่เสื่อม / แบตบวม / ชาร์จไม่เข้า",
      description: "เปลี่ยนแบตเตอรี่แท้ มอก. รีเซ็ตสุขภาพแบตเตอรี่ 100% พร้อมใบเซอร์รับรอง",
      baseLaborFee: 500,
      estimatedHours: 0.8,
      priority: "HIGH",
      badge: "รับประกัน 1 ปี",
      displayOrder: 2,
      isActive: true,
    },
    {
      id: "sym-3",
      name: "เครื่องดับสนิท / เมนบอร์ดช็อต / เปิดไม่ติด",
      description: "ยกชิปไอซี เปลี่ยนไอซีชาร์จ U2 ซ่อมชุดเพาเวอร์ภาคจ่ายไฟ และซ่อมบอร์ดสองชั้น",
      baseLaborFee: 2500,
      estimatedHours: 4.0,
      priority: "HIGH",
      badge: "ช่างเฉพาะทาง",
      displayOrder: 3,
      isActive: true,
    },
    {
      id: "sym-4",
      name: "กล้องหน้า / กล้องหลังสั่น / เลนส์แตก",
      description: "เปลี่ยนแพร์โมดูลกล้อง OIS และเปลี่ยนกระจกครอบเลนส์กล้องใส คมชัด ไม่สั่น",
      baseLaborFee: 800,
      estimatedHours: 1.2,
      priority: "MEDIUM",
      badge: "อะไหล่แท้",
      displayOrder: 4,
      isActive: true,
    },
    {
      id: "sym-5",
      name: "พอร์ตชาร์จหลวม / ไมค์สนทนา / ลำโพงล่าง",
      description: "เปลี่ยนชุดแพร์ชาร์จ Type-C / Lightning และทำความสะอาดฟิลเตอร์กันฝุ่น",
      baseLaborFee: 600,
      estimatedHours: 1.0,
      priority: "NORMAL",
      badge: "รอรับได้",
      displayOrder: 5,
      isActive: true,
    },
    {
      id: "sym-6",
      name: "เครื่องตกน้ำ / มีคราบความชื้นสะสม",
      description: "แกะล้างบอร์ดด้วยเครื่อง Ultrasonic คลีนสนิมและอบแห้ง 100% ป้องกันบอร์ดลัดวงจร",
      baseLaborFee: 1500,
      estimatedHours: 3.0,
      priority: "HIGH",
      badge: "ฉุกเฉิน",
      displayOrder: 6,
      isActive: true,
    },
    {
      id: "sym-7",
      name: "ฝาหลังแตก / เปลี่ยนโครงบอดี้ตัวเครื่อง",
      description: "ยิงเลเซอร์ลอกกาวฝาหลัง หรือเปลี่ยนชุดบอดี้ทั้งชิ้น แนบสนิทเหมือนใหม่",
      baseLaborFee: 1000,
      estimatedHours: 2.0,
      priority: "NORMAL",
      badge: "งานละเอียด",
      displayOrder: 7,
      isActive: true,
    },
  ],

  services: [
    {
      id: "srv-1",
      code: "EXPRESS_REPAIR",
      name: "บริการซ่อมด่วนรอรับเครื่องได้หน้าร้าน",
      description: "ซ่อมจอ ซ่อมแบต ด่วนภายใน 30-60 นาทีพร้อมห้องพักรับรองลูกค้าและ Wi-Fi ฟรี",
      standardPrice: 300,
      estimatedMinutes: 45,
      badge: "ยอดนิยม",
      displayOrder: 1,
      isActive: true,
    },
    {
      id: "srv-2",
      code: "FREE_DIAGNOSTIC",
      name: "ตรวจเช็คสภาพเครื่องและวัดกระแสไฟ 10 จุดฟรี",
      description: "ตรวจเช็คกระแสไฟบอร์ด แบตเตอรี่ หน้าจอ เซนเซอร์ ไม่มีค่าใช้จ่ายกรณีไม่ซ่อม",
      standardPrice: 0,
      estimatedMinutes: 20,
      badge: "ฟรี 100%",
      displayOrder: 2,
      isActive: true,
    },
    {
      id: "srv-3",
      code: "WATERPROOF_SEAL",
      name: "ติดฟิล์มกระจกและซีลยางกันน้ำมาตรฐานโรงงาน",
      description: "ซีลกาวขอบจอกันน้ำมาตรฐาน IP68 และติดฟิล์มกระจกกันรอยระดับ 9H",
      standardPrice: 350,
      estimatedMinutes: 15,
      badge: "เกรดพรีเมียม",
      displayOrder: 3,
      isActive: true,
    },
    {
      id: "srv-4",
      code: "ULTRASONIC_CLEAN",
      name: "ล้างเครื่องกำจัดออกไซด์ด้วยคลื่นอัลตราโซนิก",
      description: "ล้างทำความสะอาดแผงวงจรบอร์ดเมนด้วยน้ำยาเฉพาะและคลื่นความถี่สูง",
      standardPrice: 800,
      estimatedMinutes: 90,
      badge: "เครื่องแล็บ",
      displayOrder: 4,
      isActive: true,
    },
    {
      id: "srv-5",
      code: "DATA_RECOVERY",
      name: "สำรองและกู้คืนข้อมูลฉุกเฉินข้ามระบบ",
      description: "กู้ข้อมูลเครื่องดับ ย้ายข้อมูล iOS ไป Android หรือสำรองข้อมูลลง External Storage",
      standardPrice: 1200,
      estimatedMinutes: 120,
      badge: "ความปลอดภัยสูง",
      displayOrder: 5,
      isActive: true,
    },
  ],

  capacities: [
    { id: "c-1", capacity: "64", unit: "GB", description: "รุ่นเริ่มต้น สำหรับผู้ใช้งานทั่วไป", displayOrder: 1, isActive: true },
    { id: "c-2", capacity: "128", unit: "GB", description: "ความจุมาตรฐาน ยอดนิยมที่สุด", displayOrder: 2, isActive: true },
    { id: "c-3", capacity: "256", unit: "GB", description: "ความจุยอดนิยมสำหรับสายถ่ายภาพ/วิดีโอ", displayOrder: 3, isActive: true },
    { id: "c-4", capacity: "512", unit: "GB", description: "สำหรับโปรและคอนเทนต์ครีเอเตอร์", displayOrder: 4, isActive: true },
    { id: "c-5", capacity: "1", unit: "TB", description: "ความจุสูงสุด ไม่ต้องลบไฟล์", displayOrder: 5, isActive: true },
    { id: "c-6", capacity: "2", unit: "TB", description: "สำหรับรุ่นแฟลกชิป iPad Pro", displayOrder: 6, isActive: false },
  ],

  colors: [
    { id: "col-1", nameTh: "ไทเทเนียมธรรมชาติ", nameEn: "Natural Titanium", hexCode: "#8B857E", displayOrder: 1 },
    { id: "col-2", nameTh: "ไทเทเนียมดำ", nameEn: "Black Titanium", hexCode: "#2B2A2C", displayOrder: 2 },
    { id: "col-3", nameTh: "ไทเทเนียมขาว", nameEn: "White Titanium", hexCode: "#EBEBEA", displayOrder: 3 },
    { id: "col-4", nameTh: "ไทเทเนียมน้ำเงิน", nameEn: "Blue Titanium", hexCode: "#2E3642", displayOrder: 4 },
    { id: "col-5", nameTh: "ม่วงเข้ม", nameEn: "Deep Purple", hexCode: "#4B3B4E", displayOrder: 5 },
    { id: "col-6", nameTh: "เขียวอัลไพน์", nameEn: "Alpine Green", hexCode: "#536555", displayOrder: 6 },
    { id: "col-7", nameTh: "ทองหรู", nameEn: "Gold", hexCode: "#F5E4C4", displayOrder: 7 },
    { id: "col-8", nameTh: "เงินแฟนทอม", nameEn: "Phantom Silver", hexCode: "#DCDFE4", displayOrder: 8 },
    { id: "col-9", nameTh: "เทาสเปซเกรย์", nameEn: "Space Gray", hexCode: "#4C4C4C", displayOrder: 9 },
  ],
};
