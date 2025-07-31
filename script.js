class LadderGame {
  constructor() {
    this.canvas = document.getElementById("ladder_canvas");
    if (!this.canvas) {
      throw new Error("캔버스 요소를 찾을 수 없습니다.");
    }

    this.ctx = this.canvas.getContext("2d");
    if (!this.ctx) {
      throw new Error("캔버스 컨텍스트를 가져올 수 없습니다.");
    }

    this.participants = [];
    this.ladders = [];
    this.results = [];
    this.is_game_started = false;
    this.selected_participant = null;
    this.animation_path = [];
    this.animation_step = 0;

    // 사운드 초기화
    this.setup_sound();
    this.setup_event_listeners();
    this.initialize_game();
  }

  setup_sound() {
    // 사다리 효과음 생성 (Web Audio API 사용)
    try {
      this.audio_context = new (window.AudioContext ||
        window.webkitAudioContext)();
      this.ladder_sound = null;
    } catch (error) {
      console.log("오디오 컨텍스트를 생성할 수 없습니다:", error);
    }
  }

  play_ladder_sound() {
    if (!this.audio_context) return;

    try {
      // 게임 스타일 효과음 생성 (YouTube 영상과 비슷한 스타일)
      const oscillator1 = this.audio_context.createOscillator();
      const oscillator2 = this.audio_context.createOscillator();
      const oscillator3 = this.audio_context.createOscillator();
      const gain_node = this.audio_context.createGain();
      const filter = this.audio_context.createBiquadFilter();

      oscillator1.connect(gain_node);
      oscillator2.connect(gain_node);
      oscillator3.connect(gain_node);
      gain_node.connect(filter);
      filter.connect(this.audio_context.destination);

      // 메인 주파수 (게임 효과음 스타일)
      oscillator1.frequency.setValueAtTime(
        1500,
        this.audio_context.currentTime
      );
      oscillator1.frequency.exponentialRampToValueAtTime(
        800,
        this.audio_context.currentTime + 0.08
      );

      // 하모닉 주파수
      oscillator2.frequency.setValueAtTime(750, this.audio_context.currentTime);
      oscillator2.frequency.exponentialRampToValueAtTime(
        400,
        this.audio_context.currentTime + 0.08
      );

      // 베이스 주파수
      oscillator3.frequency.setValueAtTime(375, this.audio_context.currentTime);
      oscillator3.frequency.exponentialRampToValueAtTime(
        200,
        this.audio_context.currentTime + 0.08
      );

      // 필터 설정 (게임 효과음처럼)
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(2000, this.audio_context.currentTime);
      filter.frequency.exponentialRampToValueAtTime(
        800,
        this.audio_context.currentTime + 0.08
      );

      // 볼륨 설정 (빠른 페이드아웃)
      gain_node.gain.setValueAtTime(0.15, this.audio_context.currentTime);
      gain_node.gain.exponentialRampToValueAtTime(
        0.01,
        this.audio_context.currentTime + 0.08
      );

      // 파형 설정
      oscillator1.type = "square"; // 게임 효과음에 적합
      oscillator2.type = "sine";
      oscillator3.type = "triangle";

      oscillator1.start(this.audio_context.currentTime);
      oscillator2.start(this.audio_context.currentTime);
      oscillator3.start(this.audio_context.currentTime);
      oscillator1.stop(this.audio_context.currentTime + 0.08);
      oscillator2.stop(this.audio_context.currentTime + 0.08);
      oscillator3.stop(this.audio_context.currentTime + 0.08);
    } catch (error) {
      console.log("사운드 재생 중 오류:", error);
    }
  }

  setup_event_listeners() {
    const redraw_btn = document.getElementById("redraw_btn");
    const start_btn = document.getElementById("start_btn");

    if (!redraw_btn || !start_btn) {
      throw new Error("필요한 버튼 요소를 찾을 수 없습니다.");
    }

    redraw_btn.addEventListener("click", () => this.redraw_ladder());
    start_btn.addEventListener("click", () => this.start_game());

    // 캔버스 클릭 이벤트
    this.canvas.addEventListener("click", (e) => this.handle_canvas_click(e));
  }

  initialize_game() {
    this.generate_participants();
    this.generate_ladders();
    this.draw_ladder();
  }

  generate_participants() {
    const participant_count = parseInt(
      document.getElementById("participant_count").value
    );

    if (participant_count < 2 || participant_count > 19) {
      alert("참여자 수는 2명에서 19명 사이여야 합니다.");
      return;
    }

    // 자동으로 이름 생성
    this.participants = [];
    for (let i = 1; i <= participant_count; i++) {
      this.participants.push(`참가자${i}`);
    }
  }

  redraw_ladder() {
    this.generate_participants();
    this.generate_ladders();
    this.draw_ladder();
    this.reset_game();
  }

  generate_ladders() {
    this.ladders = [];
    const num_participants = this.participants.length;
    const column_width = 600 / (num_participants - 1);

    // 각 열 사이에 여러 개의 사다리 생성 (10개 이상 보장)
    const min_ladders = Math.max(10, num_participants * 2); // 최소 10개 이상
    let attempts = 0;
    const max_attempts = 1000; // 무한 루프 방지

    while (this.ladders.length < min_ladders && attempts < max_attempts) {
      attempts++;

      // 랜덤한 두 열 사이에 사다리 생성
      const start_col = Math.floor(Math.random() * (num_participants - 1));
      const x1 = 100 + start_col * column_width;
      const x2 = 100 + (start_col + 1) * column_width;

      // 랜덤한 y 위치 (120~320 범위)
      const y = 120 + Math.random() * 200;

      // 이미 같은 위치에 사다리가 있는지 확인
      const is_duplicate = this.ladders.some(
        (ladder) =>
          Math.abs(ladder.y1 - y) < 20 &&
          (Math.abs(ladder.x1 - x1) < 10 || Math.abs(ladder.x2 - x1) < 10)
      );

      if (!is_duplicate) {
        this.ladders.push({
          x1: x1,
          y1: y,
          x2: x2,
          y2: y,
        });
      }
    }

    // 최소 1개 이상의 사다리가 생성되도록 보장
    if (this.ladders.length < 1) {
      for (let i = 0; i < num_participants - 1; i++) {
        const x1 = 100 + i * column_width;
        const x2 = 100 + (i + 1) * column_width;
        const y = 150 + i * 50;

        this.ladders.push({
          x1: x1,
          y1: y,
          x2: x2,
          y2: y,
        });

        if (this.ladders.length >= 1) break;
      }
    }
  }

  draw_ladder() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const num_participants = this.participants.length;
    const column_width = 600 / (num_participants - 1);

    // 세로선 그리기
    this.ctx.strokeStyle = "#333";
    this.ctx.lineWidth = 2;

    for (let i = 0; i < num_participants; i++) {
      const x = 100 + i * column_width;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 100);
      this.ctx.lineTo(x, 500);
      this.ctx.stroke();
    }

    // 사다리 그리기
    this.ctx.strokeStyle = "#4a90e2";
    this.ctx.lineWidth = 3;

    this.ladders.forEach((ladder) => {
      this.ctx.beginPath();
      this.ctx.moveTo(ladder.x1, ladder.y1);
      this.ctx.lineTo(ladder.x2, ladder.y2);
      this.ctx.stroke();
    });

    // 참가자 이름 그리기
    this.ctx.fillStyle = "#333";
    this.ctx.font = "bold 14px Arial";
    this.ctx.textAlign = "center";

    for (let i = 0; i < num_participants; i++) {
      const x = 100 + i * column_width;
      this.ctx.fillText(this.participants[i], x, 80);
      // 꽝과 당첨을 번갈아가며 표시
      const result_text = i % 2 === 0 ? "꽝" : "당첨";
      this.ctx.fillText(result_text, x, 530);
    }

    // 선택된 참가자 하이라이트
    if (this.selected_participant !== null) {
      const x = 100 + this.selected_participant * column_width;
      this.ctx.fillStyle = "#28a745";
      this.ctx.font = "bold 16px Arial";
      this.ctx.fillText(this.participants[this.selected_participant], x, 80);
    }
  }

  handle_canvas_click(e) {
    if (!this.is_game_started) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const num_participants = this.participants.length;
    const column_width = 600 / (num_participants - 1);

    // 클릭한 위치가 상단 이름 영역인지 확인
    for (let i = 0; i < num_participants; i++) {
      const participant_x = 100 + i * column_width;
      if (Math.abs(x - participant_x) < 50 && y < 100) {
        this.select_participant(i);
        return;
      }
    }
  }

  select_participant(index) {
    if (this.results[index]) {
      alert(`${this.participants[index]}의 결과는 이미 확인되었습니다.`);
      return;
    }

    this.selected_participant = index;
    this.draw_ladder();
    this.animate_path(index);
  }

  animate_path(start_index) {
    this.animation_path = this.calculate_path(start_index);
    this.animation_step = 0;
    this.animate_step();
  }

  calculate_path(start_index) {
    const path = [];
    const num_participants = this.participants.length;
    const column_width = 600 / (num_participants - 1);
    let current_x = 100 + start_index * column_width;
    let current_y = 100;

    path.push({ x: current_x, y: current_y });

    // 단계별로 경로 계산
    let step_count = 0;
    const max_steps = 200; // 안전장치
    const visited_ladders = new Set(); // 방문한 사다리 추적

    while (current_y < 500 && step_count < max_steps) {
      step_count++;
      let moved = false;

      // 현재 위치에서 가로 사다리 찾기 (무조건 아래쪽만)
      let available_ladders = [];

      for (const ladder of this.ladders) {
        // 이미 방문한 사다리는 건너뛰기
        const ladder_key = `${ladder.x1},${ladder.y1},${ladder.x2},${ladder.y2}`;
        if (visited_ladders.has(ladder_key)) continue;

        // 현재 세로선에서 가로 사다리를 만났는지 확인
        const on_vertical_line =
          Math.abs(ladder.x1 - current_x) < 8 ||
          Math.abs(ladder.x2 - current_x) < 8;

        // 무조건 아래쪽에 있는 사다리만 선택 (현재 위치보다 아래)
        const below_current = ladder.y1 > current_y + 5;

        if (on_vertical_line && below_current) {
          available_ladders.push(ladder);
        }
      }

      // 사용 가능한 사다리 중에서 가장 가까운 아래쪽 것을 선택
      if (available_ladders.length > 0) {
        // 현재 위치에서 가장 가까운 아래쪽 사다리 선택
        available_ladders.sort((a, b) => a.y1 - b.y1);
        const selected_ladder = available_ladders[0];

        // 먼저 아래로 내려가서 사다리까지 이동
        const steps_down = 15;
        for (let i = 1; i <= steps_down; i++) {
          const t = i / steps_down;
          const new_y = current_y + (selected_ladder.y1 - current_y) * t;
          path.push({ x: current_x, y: new_y });
        }

        // 가로 사다리를 따라 이동
        const steps = 25;
        let start_x, end_x;

        // 현재 위치가 사다리의 어느 쪽에 있는지 확인
        if (Math.abs(selected_ladder.x1 - current_x) < 8) {
          // 왼쪽에서 오른쪽으로 이동
          start_x = selected_ladder.x1;
          end_x = selected_ladder.x2;
        } else {
          // 오른쪽에서 왼쪽으로 이동
          start_x = selected_ladder.x2;
          end_x = selected_ladder.x1;
        }

        // 사다리를 따라 이동 (수평선이므로 y는 고정)
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          const new_x = start_x + (end_x - start_x) * t;
          path.push({ x: new_x, y: selected_ladder.y1 });
        }

        // 사다리 끝에 도달
        current_x = end_x;
        current_y = selected_ladder.y1;
        const ladder_key = `${selected_ladder.x1},${selected_ladder.y1},${selected_ladder.x2},${selected_ladder.y2}`;
        visited_ladders.add(ladder_key); // 방문한 사다리로 표시
        moved = true;
      }

      if (!moved) {
        // 사다리가 없으면 아래로 이동
        current_y += 4;
        path.push({ x: current_x, y: current_y });
      }
    }

    // 마지막에 결과 라인까지 도달하도록 보장
    if (path.length > 0) {
      const last_point = path[path.length - 1];
      if (last_point.y < 500) {
        // 결과 라인까지 부드럽게 이동
        const steps_to_bottom = 15;
        for (let i = 1; i <= steps_to_bottom; i++) {
          const t = i / steps_to_bottom;
          const new_y = last_point.y + (500 - last_point.y) * t;
          path.push({ x: last_point.x, y: new_y });
        }
      }
    }

    return path;
  }

  animate_step() {
    if (this.animation_step >= this.animation_path.length) {
      this.show_result();
      return;
    }

    this.draw_ladder();

    // 경로 그리기
    this.ctx.strokeStyle = "#ff6b6b";
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();

    for (let i = 0; i <= this.animation_step; i++) {
      if (i === 0) {
        this.ctx.moveTo(this.animation_path[i].x, this.animation_path[i].y);
      } else {
        this.ctx.lineTo(this.animation_path[i].x, this.animation_path[i].y);
      }
    }
    this.ctx.stroke();

    // 현재 위치 표시
    const current_pos = this.animation_path[this.animation_step];
    this.ctx.fillStyle = "#ff6b6b";
    this.ctx.beginPath();
    this.ctx.arc(current_pos.x, current_pos.y, 6, 0, 2 * Math.PI);
    this.ctx.fill();

    // 사다리를 타는 순간 소리 재생
    if (this.animation_step > 0) {
      const prev_pos = this.animation_path[this.animation_step - 1];
      const current_pos = this.animation_path[this.animation_step];

      // 수평 이동이 있을 때 (사다리를 타는 순간)
      if (
        Math.abs(current_pos.x - prev_pos.x) > 2 &&
        Math.abs(current_pos.y - prev_pos.y) < 2
      ) {
        this.play_ladder_sound();
      }
    }

    this.animation_step++;

    // 애니메이션 속도 조절
    setTimeout(() => this.animate_step(), 30);
  }

  show_result() {
    const final_x = this.animation_path[this.animation_path.length - 1].x;
    const num_participants = this.participants.length;
    const column_width = 600 / (num_participants - 1);

    let result_index = 0;
    for (let i = 0; i < num_participants; i++) {
      const result_x = 100 + i * column_width;
      if (Math.abs(final_x - result_x) < column_width / 2) {
        result_index = i;
        break;
      }
    }

    this.results[this.selected_participant] = result_index + 1;

    const result_display = document.getElementById("result_display");
    const result_item = document.createElement("div");
    result_item.className = "result_item";

    // 꽝과 당첨을 번갈아가며 표시
    const result_text = result_index % 2 === 0 ? "꽝" : "당첨";
    result_item.textContent = `${
      this.participants[this.selected_participant]
    } → ${result_text}`;
    result_display.appendChild(result_item);

    this.selected_participant = null;
    this.draw_ladder();

    if (
      this.results.filter((r) => r !== undefined).length ===
      this.participants.length
    ) {
      this.show_message("모든 참가자의 결과가 나왔습니다!");
    }
  }

  start_game() {
    this.animation_path = [];
    this.animation_step = 0;

    this.is_game_started = true;
    this.results = [];
    document.getElementById("result_display").innerHTML = "";
    this.show_message(
      "게임이 시작되었습니다. 참가자 이름을 클릭하여 결과를 확인하세요."
    );
  }

  reset_game() {
    this.is_game_started = false;
    this.selected_participant = null;
    this.results = [];
    this.animation_path = [];
    this.animation_step = 0;

    document.getElementById("result_display").innerHTML = "";
    this.show_message("게임이 초기화되었습니다.");
  }

  show_message(message) {
    const result_display = document.getElementById("result_display");
    result_display.innerHTML = `<div style="color: #666; font-style: italic;">${message}</div>`;
  }
}

// 게임 초기화
function initGame() {
  try {
    new LadderGame();
    console.log("사다리타기 게임이 성공적으로 초기화되었습니다.");
  } catch (error) {
    console.error("게임 초기화 중 오류가 발생했습니다:", error);
    setTimeout(initGame, 1000);
  }
}

// DOM이 로드되면 게임 초기화
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGame);
} else {
  initGame();
}
