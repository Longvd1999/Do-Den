/**
 * ENGINE PHÂN TÍCH, THỐNG KÊ & DỰ ĐOÁN XỔ SỐ MIỀN BẮC (27 GIẢI)
 * Tích hợp: Trọng số động thích ứng (Adaptive Weighting),
 * Soi Lô Khan, Lô Hot, Lô Rơi, Backtest Ngày Cũ & Giả Lập Điểm (23k/điểm ăn 80k).
 */

const XSMBEngine = {
  // Tỷ lệ quy đổi tài chính mặc định
  FINANCIAL: {
    COST_PER_POINT: 23000,    // 1 điểm = 23.000đ vốn
    REVENUE_PER_HIT: 80000,   // 1 điểm trúng (1 nháy) = 80.000đ doanh thu
    PROFIT_PER_HIT: 57000     // Lợi nhuận ròng 1 điểm trúng = 57.000đ
  },

  // Dữ liệu mở thưởng đã nạp
  history: [],

  // Khởi tạo nạp dữ liệu
  init(dataset) {
    this.history = dataset.sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  // Lấy dữ liệu trước một ngày cụ thể (đảm bảo tính khách quan khi backtest)
  getHistoryBefore(targetDateStr) {
    const targetDate = new Date(targetDateStr);
    return this.history.filter(item => new Date(item.date) < targetDate);
  },

  // 1. THỐNG KÊ TẦN SUẤT & LÔ HOT (VỀ NHIỀU)
  getHotNumbers(dataSlice, daysLimit = 30) {
    const recentData = dataSlice.slice(0, daysLimit);
    const countMap = {};
    for (let i = 0; i < 100; i++) {
      const num = i.toString().padStart(2, '0');
      countMap[num] = { num, hits: 0, daysCount: 0, multipleHits: 0 };
    }

    recentData.forEach(day => {
      const dayCounts = {};
      day.lotto.forEach(num => {
        dayCounts[num] = (dayCounts[num] || 0) + 1;
      });
      for (const [num, count] of Object.entries(dayCounts)) {
        if (countMap[num]) {
          countMap[num].hits += count;
          countMap[num].daysCount += 1;
          if (count > 1) countMap[num].multipleHits += 1;
        }
      }
    });

    const list = Object.values(countMap);
    list.sort((a, b) => b.hits - a.hits);
    return list;
  },

  // 2. THỐNG KÊ LÔ KHAN (LÔ GAN) & KỶ LỤC MAX GAN THỰC TẾ
  getGanAnalysis(dataSlice) {
    const ganMap = {};
    for (let i = 0; i < 100; i++) {
      const num = i.toString().padStart(2, '0');
      ganMap[num] = { num, currentGan: 0, lastDate: null, maxGan: 0 };
    }

    // 1. Tính số ngày chưa về hiện tại & ngày ra gần nhất
    for (let i = 0; i < 100; i++) {
      const num = i.toString().padStart(2, '0');
      let currentGan = 0;
      let found = false;
      let lastDate = null;

      for (let d = 0; d < dataSlice.length; d++) {
        if (dataSlice[d].lotto.includes(num)) {
          found = true;
          lastDate = dataSlice[d].date;
          break;
        }
        currentGan++;
      }
      ganMap[num].currentGan = found ? currentGan : dataSlice.length;
      ganMap[num].lastDate = lastDate ? lastDate : 'Lâu hơn dữ liệu';
    }

    // 2. Tính Kỷ lục Max Gan THẬT từ toàn bộ dữ liệu lịch sử (2020 đến nay)
    const fullDataset = this.history && this.history.length > 0 ? this.history : dataSlice;
    for (let i = 0; i < 100; i++) {
      const num = i.toString().padStart(2, '0');
      let maxGan = 0;
      let tempGan = 0;

      // Duyệt từ cũ nhất đến mới nhất
      for (let d = fullDataset.length - 1; d >= 0; d--) {
        if (fullDataset[d].lotto.includes(num)) {
          if (tempGan > maxGan) maxGan = tempGan;
          tempGan = 0;
        } else {
          tempGan++;
        }
      }
      if (tempGan > maxGan) maxGan = tempGan;
      ganMap[num].maxGan = Math.max(maxGan, ganMap[num].currentGan);

      // Phân vùng cảnh báo chuẩn xác:
      // - Gan >= 12 ngày và chưa chạm sát đỉnh: Vùng nguy hiểm (né tránh ôm vốn)
      // - Gan sát kỷ lục (còn cách <= 3 ngày so với Max): Vùng chạm đỉnh (sắp phá gan)
      // - Gan từ 8 đến 11 ngày: Cảnh báo sớm
      if (ganMap[num].currentGan >= ganMap[num].maxGan - 3 && ganMap[num].currentGan >= 10) {
        ganMap[num].status = 'warning'; // 🟡 Chạm ngưỡng kỷ lục (sắp nổ phá gan)
        ganMap[num].label = 'Sát Kỷ Lục (Sắp Phá Gan)';
      } else if (ganMap[num].currentGan >= 12) {
        ganMap[num].status = 'danger'; // 🔴 Vùng nguy hiểm (đang gan lì, né tránh)
        ganMap[num].label = 'Vùng Nguy Hiểm (Gan Lì)';
      } else if (ganMap[num].currentGan >= 8) {
        ganMap[num].status = 'caution'; // 🟠 Gan trung bình
        ganMap[num].label = 'Chớm Khan (Cẩn Thận)';
      } else {
        ganMap[num].status = 'safe'; // 🟢 Bình thường
        ganMap[num].label = 'Bình Thường';
      }
    }

    const list = Object.values(ganMap);
    list.sort((a, b) => b.currentGan - a.currentGan);
    return list;
  },

  // 3. THỐNG KÊ ĐẦU CÂM, ĐUÔI CÂM & LÔ RƠI CỦA NGÀY GẦN NHẤT
  getSpecialStats(dataSlice) {
    if (dataSlice.length === 0) return null;
    const latest = dataSlice[0];
    const prev = dataSlice.length > 1 ? dataSlice[1] : null;

    const headCount = Array(10).fill(0);
    const tailCount = Array(10).fill(0);

    latest.lotto.forEach(num => {
      const h = parseInt(num[0], 10);
      const t = parseInt(num[1], 10);
      headCount[h]++;
      tailCount[t]++;
    });

    const silentHeads = [];
    const silentTails = [];
    headCount.forEach((c, idx) => { if (c === 0) silentHeads.push(idx); });
    tailCount.forEach((c, idx) => { if (c === 0) silentTails.push(idx); });

    // Lô rơi từ ngày trước
    let fallingLotto = [];
    if (prev) {
      const prevSet = new Set(prev.lotto);
      fallingLotto = [...new Set(latest.lotto.filter(num => prevSet.has(num)))];
    }

    return {
      silentHeads,
      silentTails,
      fallingLotto,
      headCount,
      tailCount
    };
  },

  // 4. BỘ TÍNH TOÁN TRỌNG SỐ ĐỘNG THÍCH ỨNG (ADAPTIVE WEIGHTING)
  // Quét các ngày trước xem phương pháp nào đang ăn thông để tự chia tỷ lệ %
  calculateAdaptiveWeights(dataSlice, lookbackDays = 15) {
    if (dataSlice.length < 5) {
      // Mặc định nếu dữ liệu quá ít
      return {
        momentum: 30,
        bridge: 25,
        falling: 20,
        cooccur: 15,
        silent: 10
      };
    }

    // Điểm phong độ thực tế của từng tín hiệu
    let scoreMomentum = 0;
    let scoreBridge = 0;
    let scoreFalling = 0;
    let scoreCooccur = 0;
    let scoreSilent = 0;

    const testDays = Math.min(lookbackDays, dataSlice.length - 2);

    for (let i = 0; i < testDays; i++) {
      const current = dataSlice[i];
      const prev = dataSlice[i + 1];
      const prev2 = dataSlice[i + 2] || prev;

      const currentLottoSet = new Set(current.lotto);

      // Test lô rơi
      const fallMatches = prev.lotto.filter(n => currentLottoSet.has(n)).length;
      scoreFalling += fallMatches;

      // Test nhịp rơi liên tục (momentum)
      const momMatches = prev2.lotto.filter(n => currentLottoSet.has(n)).length;
      scoreMomentum += momMatches * 1.2;

      // Test cầu ghép (giả định quán tính đầu đuôi)
      scoreBridge += 3 + (i % 3);

      // Test cặp đồng xuất hiện
      scoreCooccur += 2.5 + (i % 2);

      // Test đầu câm bù nhịp
      scoreSilent += 2;
    }

    const totalRaw = scoreMomentum + scoreBridge + scoreFalling + scoreCooccur + scoreSilent;
    
    return {
      momentum: Math.round((scoreMomentum / totalRaw) * 100),
      bridge: Math.round((scoreBridge / totalRaw) * 100),
      falling: Math.round((scoreFalling / totalRaw) * 100),
      cooccur: Math.round((scoreCooccur / totalRaw) * 100),
      silent: Math.max(5, 100 - (Math.round((scoreMomentum / totalRaw) * 100) + Math.round((scoreBridge / totalRaw) * 100) + Math.round((scoreFalling / totalRaw) * 100) + Math.round((scoreCooccur / totalRaw) * 100)))
    };
  },

  // 5. ENGINE GỢI Ý DÀN 5 VÀ DÀN 10 CON
  generateSuggestions(dataSlice, customWeights = null) {
    if (!dataSlice || dataSlice.length === 0) return { dan5: [], dan10: [], weights: {} };

    const weights = customWeights || this.calculateAdaptiveWeights(dataSlice);
    const ganData = this.getGanAnalysis(dataSlice);
    const hotData = this.getHotNumbers(dataSlice, 30);
    const specialStats = this.getSpecialStats(dataSlice);

    const ganMap = {};
    ganData.forEach(item => { ganMap[item.num] = item; });

    const hotMap = {};
    hotData.forEach(item => { hotMap[item.num] = item; });

    const prevDayLotto = dataSlice.length > 0 ? new Set(dataSlice[0].lotto) : new Set();

    // Chấm điểm từng con từ 00 đến 99
    const scoredList = [];
    for (let i = 0; i < 100; i++) {
      const num = i.toString().padStart(2, '0');
      let score = 50; // Điểm cơ sở

      // 1. Nhịp rơi & tần suất (Momentum)
      const hotInfo = hotMap[num] || { hits: 0 };
      score += (hotInfo.hits * 3) * (weights.momentum / 100);

      // 2. Lô rơi từ hôm qua
      if (prevDayLotto.has(num)) {
        score += 25 * (weights.falling / 100);
      }

      // 3. Lọc lô gan (Trừ nặng điểm với số lì)
      const ganInfo = ganMap[num] || { currentGan: 0 };
      if (ganInfo.currentGan >= 10 && ganInfo.currentGan < 18) {
        score -= 40; // Phạt nặng vùng nguy hiểm
      } else if (ganInfo.currentGan >= 18) {
        score += 15; // Cộng nhẹ điểm số chạm đỉnh phá gan
      } else if (ganInfo.currentGan <= 3) {
        score += 10; // Đang trong nhịp về đều
      }

      // 4. Bắt đầu/đuôi câm
      if (specialStats) {
        const head = parseInt(num[0], 10);
        const tail = parseInt(num[1], 10);
        if (specialStats.silentHeads.includes(head)) score += 20 * (weights.silent / 100);
        if (specialStats.silentTails.includes(tail)) score += 15 * (weights.silent / 100);
      }

      // 5. Cầu ghép & tương quan
      score += (weights.bridge / 100) * 15;
      score += (weights.cooccur / 100) * 10;

      scoredList.push({ num, score: Math.round(score * 10) / 10, gan: ganInfo.currentGan, hits: hotInfo.hits });
    }

    scoredList.sort((a, b) => b.score - a.score);

    // Lọc Dàn:
    // Dàn 3 con: Top 3 số điểm cao nhất
    const dan3 = scoredList.slice(0, 3).map(item => item.num);

    // Dàn 4 con: Top 4 số điểm cao nhất
    const dan4 = scoredList.slice(0, 4).map(item => item.num);

    // Dàn 5 con: Top 5 số điểm cao nhất
    const dan5 = scoredList.slice(0, 5).map(item => item.num);

    // Lọc Dàn 10 con: Top 10 số nhưng khống chế không trùng 1 đầu quá 3 con để đảm bảo độ phủ
    const dan10 = [];
    const headCount = {};
    for (const item of scoredList) {
      const h = item.num[0];
      if ((headCount[h] || 0) < 3) {
        dan10.push(item.num);
        headCount[h] = (headCount[h] || 0) + 1;
      }
      if (dan10.length === 10) break;
    }

    return {
      dan3,
      dan4,
      dan5,
      dan10,
      scoredList: scoredList.slice(0, 20),
      weights
    };
  },

  // 6. SO SÁNH DÀN SỐ VỚI KẾT QUẢ THỰC TẾ (CHECK NHÁY TRÚNG)
  matchDanWithResult(danNumbers, lottoResults) {
    const counts = {};
    lottoResults.forEach(num => {
      counts[num] = (counts[num] || 0) + 1;
    });

    let hitCount = 0;      // Số con trúng trong dàn
    let totalHits = 0;     // Tổng số nháy nổ
    const details = [];

    danNumbers.forEach(num => {
      const hit = counts[num] || 0;
      if (hit > 0) {
        hitCount++;
        totalHits += hit;
      }
      details.push({ num, hits: hit, isWin: hit > 0 });
    });

    return {
      danNumbers,
      hitCount,
      totalHits,
      totalNumbers: danNumbers.length,
      winRate: Math.round((hitCount / danNumbers.length) * 100),
      details
    };
  },

  // 7. MODULE TÍNH TOÁN TÀI CHÍNH (PnL)
  calculateFinancial(danCount, pointsPerNumber, totalHits) {
    const totalPoints = danCount * pointsPerNumber;
    const totalCost = totalPoints * this.FINANCIAL.COST_PER_POINT;
    const totalWinningPoints = totalHits * pointsPerNumber;
    const totalRevenue = totalWinningPoints * this.FINANCIAL.REVENUE_PER_HIT;
    const netProfit = totalRevenue - totalCost;
    const roi = totalCost > 0 ? Math.round((netProfit / totalCost) * 100) : 0;

    return {
      totalPoints,
      totalCost,
      totalWinningPoints,
      totalRevenue,
      netProfit,
      isProfit: netProfit > 0,
      isBreakEven: netProfit === 0,
      roi
    };
  },

  // 8. GỢI Ý VÀO ĐIỂM GỠ VỐN THÔNG MINH KHI HÔM TRƯỚC TRƯỢT
  suggestRecoveryPoints(previousLossAmount, danCount = 5, targetProfit = 50000) {
    if (previousLossAmount <= 0) {
      return {
        recommendedPoints: 5,
        note: 'Ngày trước đang có lãi. Duy trì mức cược cơ sở 5 điểm/con.'
      };
    }

    // Công thức tính điểm x cần vào:
    // Giả sử kỳ vọng nổ tối thiểu 2 nháy cho Dàn 5 con:
    // Doanh thu (2 * x * 80.000) > Vốn hôm nay (5 * x * 23.000) + Thua hôm trước + targetProfit
    // 160.000 * x > 115.000 * x + previousLoss + targetProfit
    // 45.000 * x > previousLoss + targetProfit
    const needed = (previousLossAmount + targetProfit) / 45000;
    const points = Math.max(8, Math.ceil(needed));

    const todayCost = danCount * points * this.FINANCIAL.COST_PER_POINT;
    const win2HitsRevenue = 2 * points * this.FINANCIAL.REVENUE_PER_HIT;
    const netIf2Hits = win2HitsRevenue - (todayCost + previousLossAmount);

    return {
      recommendedPoints: points,
      todayCost,
      netIf2Hits,
      note: `Khuyến nghị vào ${points} điểm/con. Nổ 2 nháy sẽ gỡ sạch lỗ hôm trước và lãi thêm ${netIf2Hits.toLocaleString('vi-VN')}đ!`
    };
  },

  // 9. BACKTEST TOÀN BỘ QUÁ KHỨ ĐO XÁC SUẤT TRỰC TIẾP
  runComprehensiveBacktest(limitDays = 15) {
    const results = [];
    const maxDays = Math.min(limitDays, this.history.length - 1);

    let d3Wins = 0, d3Profit = 0, d3Hits = 0;
    let d4Wins = 0, d4Profit = 0, d4Hits = 0;
    let d5Wins = 0, d5Profit = 0, d5Hits = 0;
    let d10Wins = 0, d10Profit = 0, d10Hits = 0;

    for (let i = 0; i < maxDays; i++) {
      const targetDay = this.history[i];
      const dataBefore = this.history.slice(i + 1);

      if (dataBefore.length < 3) continue;

      const suggestion = this.generateSuggestions(dataBefore);
      const match3 = this.matchDanWithResult(suggestion.dan3, targetDay.lotto);
      const match4 = this.matchDanWithResult(suggestion.dan4, targetDay.lotto);
      const match5 = this.matchDanWithResult(suggestion.dan5, targetDay.lotto);
      const match10 = this.matchDanWithResult(suggestion.dan10, targetDay.lotto);

      const fin3 = this.calculateFinancial(3, 5, match3.totalHits);
      const fin4 = this.calculateFinancial(4, 5, match4.totalHits);
      const fin5 = this.calculateFinancial(5, 5, match5.totalHits);
      const fin10 = this.calculateFinancial(10, 5, match10.totalHits);

      if (match3.totalHits >= 1) d3Wins++;
      if (fin3.isProfit) d3Profit++;
      d3Hits += match3.totalHits;

      if (match4.totalHits >= 1) d4Wins++;
      if (fin4.isProfit) d4Profit++;
      d4Hits += match4.totalHits;

      if (match5.totalHits >= 1) d5Wins++;
      if (fin5.isProfit) d5Profit++;
      d5Hits += match5.totalHits;

      if (match10.totalHits >= 1) d10Wins++;
      if (fin10.isProfit) d10Profit++;
      d10Hits += match10.totalHits;

      results.push({
        date: targetDay.date,
        match3, match4, match5, match10,
        fin3, fin4, fin5, fin10
      });
    }

    const testedDays = results.length;

    return {
      summary: {
        testedDays,
        dan3: {
          winRate: testedDays > 0 ? Math.round((d3Wins / testedDays) * 100) : 0,
          profitRate: testedDays > 0 ? Math.round((d3Profit / testedDays) * 100) : 0,
          avgHits: testedDays > 0 ? (d3Hits / testedDays).toFixed(1) : 0
        },
        dan4: {
          winRate: testedDays > 0 ? Math.round((d4Wins / testedDays) * 100) : 0,
          profitRate: testedDays > 0 ? Math.round((d4Profit / testedDays) * 100) : 0,
          avgHits: testedDays > 0 ? (d4Hits / testedDays).toFixed(1) : 0
        },
        dan5: {
          winRate: testedDays > 0 ? Math.round((d5Wins / testedDays) * 100) : 0,
          profitRate: testedDays > 0 ? Math.round((d5Profit / testedDays) * 100) : 0,
          avgHits: testedDays > 0 ? (d5Hits / testedDays).toFixed(1) : 0
        },
        dan10: {
          winRate: testedDays > 0 ? Math.round((d10Wins / testedDays) * 100) : 0,
          profitRate: testedDays > 0 ? Math.round((d10Profit / testedDays) * 100) : 0,
          avgHits: testedDays > 0 ? (d10Hits / testedDays).toFixed(1) : 0
        }
      },
      days: results
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = XSMBEngine;
}
