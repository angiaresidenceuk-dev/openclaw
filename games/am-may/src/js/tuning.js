/**
 * Mọi con số chỉnh được của Am Mây ở một chỗ (coding standard: gameplay values
 * are data, not literals scattered through code). Server dùng chung file này.
 */
export const TUNING = Object.freeze({
  // Thế giới logic, tính bằng "điểm cảnh" (scaled to fit the screen).
  world: { width: 360, height: 640 },
  walkSpeed: 70, // điểm cảnh / giây

  incense: {
    sticksPerOffering: 3,
    burnMinutes: 5,
    cooldownSeconds: 20,
    maxDrawnSticks: 27, // bát hương chung không vẽ quá số này
  },
  bow: { perSet: 3, secondsPerBow: 2.2 },
  beads: { perRound: 108 },
  bell: {
    personalCooldownSeconds: 15,
    roomCooldownSeconds: 10, // server: chỉ một tiếng chuông chung mỗi 10 giây
  },
  meditation: {
    presetsMinutes: [3, 5, 10, 15, 20],
    inhaleSeconds: 4,
    exhaleSeconds: 6,
    endBells: 3,
  },
  lantern: {
    maxWishChars: 80,
    driftMinutes: 10,
    cooldownSeconds: 30,
    colors: ["sen", "do", "vang"],
  },
  rest: { remindAfterMinutes: 60 },
  // Tên miền in trên thiệp chia sẻ. Để trống cho tới khi có domain thật.
  share: { url: "" },
  // Đêm Rằm: chính Am Mây thắp sẵn vài ngọn đèn trên hồ (trang trí của am, không phải người chơi).
  ramLanterns: 8,
  room: {
    capacity: 24, // = số bồ đoàn trên sân
    maxRooms: 400,
    actionsPerWindow: 8,
    windowSeconds: 5,
    heartbeatSeconds: 20,
  },
});
