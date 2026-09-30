const timeText = document.getElementById("time");
const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");

let totalSeconds = 25 * 60;
let timerId = null;
let isRunning = false;

function showTime() {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  timeText.textContent =
    `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function startTimer() {
  if (isRunning) {
    clearInterval(timerId);
    isRunning = false;
    startBtn.textContent = "Start";
    return;
  }

isRunning = true;
  startBtn.textContent = "Pause";

  timerId = setInterval(() => {
    totalSeconds--;

    if (totalSeconds <= 0) {
      clearInterval(timerId);
      isRunning = false;
      totalSeconds = 0;
      startBtn.textContent = "Start";
      showTime();
      alert("Pomodoro session complete!");
      return;
    }

    showTime();
  }, 1000);
}

function resetTimer() {
  clearInterval(timerId);
  totalSeconds = 25 * 60;
  isRunning = false;
  startBtn.textContent = "Start";
  showTime();
}

startBtn.addEventListener("click", startTimer);
resetBtn.addEventListener("click", resetTimer);

showTime();