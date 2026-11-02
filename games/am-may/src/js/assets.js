// Mô hình 3D lấy từ bên ngoài (glTF/GLB). Mỗi "ô" (slot) nói: tệp ở đâu, đặt
// vào vùng nào của am, che phần nào đang dựng bằng code, và ghi công tác giả.
// Thiếu tệp hoặc máy không tải được thì game giữ nguyên phần dựng bằng code.
//
// Toạ độ là đơn vị 3D của view3d.js (1 đơn vị = 10 điểm mặt bằng 360×640):
// X trái/phải, Z trước/sau; chính điện tự dựng nằm quanh X 0, Z -20.

/**
 * @typedef {object} ModelSlot
 * @property {string} id
 * @property {string} url             đường dẫn tương đối từ trang (src/)
 * @property {[number, number]} center  tâm vùng đặt [X, Z]
 * @property {number} width           bề ngang tối đa (trục X) sau khi xoay
 * @property {number} depth           bề sâu tối đa (trục Z) sau khi xoay
 * @property {number} [y]             cao độ đáy mô hình
 * @property {number} [yaw]           góc xoay quanh trục đứng (radian)
 * @property {string[]} hides         phần dựng bằng code sẽ ẩn: hall | bellTower | gate | walls
 * @property {"altar"|"bell"|"pond"} kind  chạm vào mô hình thì đi tới đâu
 * @property {{title:string, author:string, url:string, license:string, licenseUrl:string}} credit
 */

/** @type {ReadonlyArray<ModelSlot>} */
export const MODEL_SLOTS = Object.freeze([
  {
    id: "hall",
    url: "assets/models/temple-enviroment.glb",
    center: [0, -20.5],
    width: 25,
    depth: 14,
    y: 0,
    yaw: 0,
    hides: ["hall"],
    kind: "altar",
    credit: {
      title: "temple enviroment",
      author: "Phuong Yen (kienvtcacademy2004), modeling by trungkienvtca",
      url: "https://sketchfab.com/3d-models/temple-enviroment-3a4d5b2bed164fe29cf4da0b96f1adf1",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    },
  },
]);

/** Ghi công cố định (thư viện), luôn hiện trong "Về Am Mây". */
export const LIBRARY_CREDITS = Object.freeze([
  { title: "Three.js r128", author: "Three.js Authors", url: "https://threejs.org", license: "MIT", licenseUrl: "https://github.com/mrdoob/three.js/blob/dev/LICENSE" },
]);
