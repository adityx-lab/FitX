// ════════════════════════════════════════════════════
// formChecker.js — Form Checker tab
// TensorFlow.js + MoveNet pose detection, fully local.
// Rule-based exercise classification + scoring engine —
// no backend / Claude call involved here.
// ════════════════════════════════════════════════════

async function startCamera() {
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
    const video = document.getElementById('cameraFeed');
    video.srcObject = cameraStream;
    document.getElementById('camera-overlay').style.display = 'none';
    document.getElementById('start-cam-btn').style.display  = 'none';
    document.getElementById('stop-cam-btn').style.display   = '';

    // Update feedback UI
    setFeedback('warning', 'Loading pose model…', 'Please wait while the AI model loads. This takes a few seconds.');

    // Load MoveNet pose detector
    poseDetector = await poseDetection.createDetector(
      poseDetection.SupportedModels.MoveNet,
      { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
    );

    setFeedback('good', 'Ready — begin your exercise', 'Stand 1–2 metres from the camera. FitX will detect your exercise automatically.');
    document.getElementById('detected-ex-wrap').style.display = '';
    document.getElementById('score-panel').style.display      = '';

    startAnalysisLoop();
  } catch (e) {
    setFeedback('bad', 'Camera access denied', 'Please allow camera access in your browser settings and try again.');
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
  if (analyzeLoop) {
    cancelAnimationFrame(analyzeLoop);
    analyzeLoop = null;
  }
  const overlay  = document.getElementById('camera-overlay');
  const startBtn = document.getElementById('start-cam-btn');
  const stopBtn  = document.getElementById('stop-cam-btn');
  if (overlay)  overlay.style.display = '';
  if (startBtn) startBtn.style.display = '';
  if (stopBtn)  stopBtn.style.display  = 'none';

  const detectedWrap = document.getElementById('detected-ex-wrap');
  const scorePanel   = document.getElementById('score-panel');
  if (detectedWrap) detectedWrap.style.display = 'none';
  if (scorePanel)   scorePanel.style.display   = 'none';

  poseHistory = [];

  // stop any in-progress labeling session too
  if (isLabeling) toggleLabeling();
}

function startAnalysisLoop() {
  const video  = document.getElementById('cameraFeed');
  const canvas = document.getElementById('poseCanvas');

  async function loop() {
    if (!cameraStream || !poseDetector) return;

    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');

    try {
      const poses = await poseDetector.estimatePoses(video);
      if (poses.length > 0) {
        drawSkeleton(ctx, poses[0], canvas.width, canvas.height);
        const keypoints = poses[0].keypoints;
        poseHistory.push({ keypoints, timestamp: Date.now() });
        if (poseHistory.length > 60) poseHistory.shift(); // keep last 60 frames

        // Throttled training-data logging (200ms) — independent of feedback throttle
        logTrainingFrame(keypoints);

        // Run form analysis every 3 seconds — this is local now, but keeping it
        // throttled avoids flickering the UI on every single frame
        if (Date.now() - lastFeedback > 3000 && poseHistory.length >= 10) {
          lastFeedback = Date.now();
          analyzeForm(keypoints);
        }
      }
    } catch (e) { /* silently ignore single-frame errors */ }

    analyzeLoop = requestAnimationFrame(loop);
  }
  loop();
}

// Draw skeleton on canvas
function drawSkeleton(ctx, pose, w, h) {
  ctx.clearRect(0, 0, w, h);
  const kp = pose.keypoints;
  const connections = [
    [5,7],[7,9],[6,8],[8,10],   // arms
    [5,6],[5,11],[6,12],[11,12], // torso
    [11,13],[13,15],[12,14],[14,16] // legs
  ];

  ctx.strokeStyle = '#4CAF50';
  ctx.lineWidth   = 3;
  connections.forEach(([a, b]) => {
    const pa = kp[a], pb = kp[b];
    if (pa.score > 0.3 && pb.score > 0.3) {
      ctx.beginPath();
      ctx.moveTo(pa.x * (w / ctx.canvas.width || 1), pa.y * (h / ctx.canvas.height || 1));
      ctx.lineTo(pb.x * (w / ctx.canvas.width || 1), pb.y * (h / ctx.canvas.height || 1));
      ctx.stroke();
    }
  });

  kp.forEach(p => {
    if (p.score > 0.3) {
      ctx.beginPath();
      ctx.arc(p.x * (w / ctx.canvas.width || 1), p.y * (h / ctx.canvas.height || 1), 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth   = 2;
      ctx.stroke();
    }
  });
}

// ── Angle feature extraction ──────────────────────
// Keypoint indices (MoveNet / COCO order):
// 5=L-shoulder, 6=R-shoulder, 7=L-elbow, 8=R-elbow, 9=L-wrist, 10=R-wrist,
// 11=L-hip, 12=R-hip, 13=L-knee, 14=R-knee, 15=L-ankle, 16=R-ankle
function getAngleValues(kp) {
  const angle = (a, b, c) => {
    if (!a || !b || !c) return null;
    if (a.score < 0.3 || b.score < 0.3 || c.score < 0.3) return null;
    const ab = { x: a.x - b.x, y: a.y - b.y };
    const cb = { x: c.x - b.x, y: c.y - b.y };
    const dot = ab.x*cb.x + ab.y*cb.y;
    const mag = Math.sqrt((ab.x**2+ab.y**2)) * Math.sqrt((cb.x**2+cb.y**2));
    if (mag === 0) return null;
    return Math.acos(Math.min(Math.max(dot/mag, -1), 1)) * 180 / Math.PI;
  };

  const leftElbow  = angle(kp[5], kp[7], kp[9]);
  const rightElbow = angle(kp[6], kp[8], kp[10]);
  const leftKnee   = angle(kp[11], kp[13], kp[15]);
  const rightKnee  = angle(kp[12], kp[14], kp[16]);
  const leftHip    = angle(kp[5], kp[11], kp[13]);
  const rightHip   = angle(kp[6], kp[12], kp[14]);
  const leftShoulder  = angle(kp[7], kp[5], kp[11]);
  const rightShoulder = angle(kp[8], kp[6], kp[12]);

  let backLean = null;
  if (kp[5].score > 0.3 && kp[6].score > 0.3 && kp[11].score > 0.3 && kp[12].score > 0.3) {
    const shoulderMid = { x: (kp[5].x + kp[6].x) / 2, y: (kp[5].y + kp[6].y) / 2 };
    const hipMid      = { x: (kp[11].x + kp[12].x) / 2, y: (kp[11].y + kp[12].y) / 2 };
    const dx = hipMid.x - shoulderMid.x;
    const dy = hipMid.y - shoulderMid.y;
    backLean = Math.abs(Math.atan2(dx, dy) * 180 / Math.PI); // 0° = upright
  } else if (kp[5].score > 0.3 && kp[11].score > 0.3) {
    const torsoAngle = Math.atan2(kp[11].y - kp[5].y, kp[11].x - kp[5].x) * 180 / Math.PI;
    backLean = Math.abs(torsoAngle - 90);
  }

  const avgHip      = (leftHip !== null && rightHip !== null) ? (leftHip + rightHip) / 2 : (leftHip ?? rightHip);
  const avgKnee     = (leftKnee !== null && rightKnee !== null) ? (leftKnee + rightKnee) / 2 : (leftKnee ?? rightKnee);
  const avgElbow    = (leftElbow !== null && rightElbow !== null) ? (leftElbow + rightElbow) / 2 : (leftElbow ?? rightElbow);
  const avgShoulder = (leftShoulder !== null && rightShoulder !== null) ? (leftShoulder + rightShoulder) / 2 : (leftShoulder ?? rightShoulder);

  const hipAsymmetry  = (leftHip !== null && rightHip !== null) ? Math.abs(leftHip - rightHip) : null;
  const kneeAsymmetry = (leftKnee !== null && rightKnee !== null) ? Math.abs(leftKnee - rightKnee) : null;

  return {
    leftElbow, rightElbow, leftKnee, rightKnee, leftHip, rightHip,
    leftShoulder, rightShoulder, backLean, avgHip, avgKnee, avgElbow, avgShoulder,
    hipAsymmetry, kneeAsymmetry
  };
}

// Max-min range of a value across recent pose history frames
function angleRange(history, getter) {
  const vals = history.map(f => getter(getAngleValues(f.keypoints))).filter(v => v !== null && v !== undefined);
  if (vals.length < 3) return 0;
  return Math.max(...vals) - Math.min(...vals);
}

// Classify exercise from movement signature over recent frames
function classifyExercise(history) {
  if (history.length < 8) return null;

  const recent = history.slice(-30);
  const kneeRange       = angleRange(recent, a => a.avgKnee);
  const hipRange        = angleRange(recent, a => a.avgHip);
  const elbowRange      = angleRange(recent, a => a.avgElbow);
  const shoulderRange   = angleRange(recent, a => a.avgShoulder);
  const leftKneeRange   = angleRange(recent, a => a.leftKnee);
  const rightKneeRange  = angleRange(recent, a => a.rightKnee);

  if (Math.max(leftKneeRange, rightKneeRange) > 40 && Math.min(leftKneeRange, rightKneeRange) < 20) {
    return 'Lunge'; // one leg moves far more than the other
  }
  if (kneeRange > 35 && hipRange > 25 && elbowRange < 30) {
    return 'Squat';
  }
  if (elbowRange > 45 && kneeRange < 15 && hipRange < 15) {
    return 'Bicep Curl';
  }
  if (shoulderRange > 30 && elbowRange > 30 && kneeRange < 15) {
    return 'Overhead Press';
  }
  if (kneeRange < 10 && hipRange < 10 && elbowRange < 10 && shoulderRange < 10) {
    return 'Plank';
  }
  return 'General Movement';
}

// Ideal ranges + correction rules per exercise
const EXERCISE_RULES = {
  'Squat': {
    check(a) {
      const corrections = []; let score = 100;
      if (a.avgKnee !== null && a.avgKnee > 110 && a.avgKnee < 160) {
        corrections.push({ icon: '⬇️', text: 'Go deeper — aim for thighs closer to parallel with the floor.' });
        score -= 15;
      }
      if (a.backLean !== null && a.backLean > 30) {
        corrections.push({ icon: '⚠️', text: 'Keep your chest up — you are leaning too far forward.' });
        score -= 20;
      }
      if (a.hipAsymmetry !== null && a.hipAsymmetry > 15) {
        corrections.push({ icon: '⚖️', text: 'Balance your weight evenly — one side is dropping more than the other.' });
        score -= 15;
      }
      if (a.kneeAsymmetry !== null && a.kneeAsymmetry > 15) {
        corrections.push({ icon: '🦵', text: 'Keep both knees bending at the same rate.' });
        score -= 10;
      }
      return { score: Math.max(score, 0), corrections };
    }
  },
  'Lunge': {
    check(a) {
      const corrections = []; let score = 100;
      if (a.backLean !== null && a.backLean > 25) {
        corrections.push({ icon: '⚠️', text: 'Keep your torso upright during the lunge.' });
        score -= 20;
      }
      if (a.avgKnee !== null && a.avgKnee > 160) {
        corrections.push({ icon: '⬇️', text: 'Bend your front knee closer to 90° at the bottom.' });
        score -= 15;
      }
      return { score: Math.max(score, 0), corrections };
    }
  },
  'Bicep Curl': {
    check(a) {
      const corrections = []; let score = 100;
      if (a.backLean !== null && a.backLean > 15) {
        corrections.push({ icon: '⚠️', text: 'Keep your torso still — avoid swinging your body to lift the weight.' });
        score -= 25;
      }
      const diff = (a.leftElbow !== null && a.rightElbow !== null) ? Math.abs(a.leftElbow - a.rightElbow) : null;
      if (diff !== null && diff > 20) {
        corrections.push({ icon: '💪', text: 'Curl both arms at the same pace and range.' });
        score -= 15;
      }
      return { score: Math.max(score, 0), corrections };
    }
  },
  'Overhead Press': {
    check(a) {
      const corrections = []; let score = 100;
      if (a.backLean !== null && a.backLean > 20) {
        corrections.push({ icon: '⚠️', text: 'Avoid arching your back — brace your core as you press up.' });
        score -= 20;
      }
      const diff = (a.leftShoulder !== null && a.rightShoulder !== null) ? Math.abs(a.leftShoulder - a.rightShoulder) : null;
      if (diff !== null && diff > 20) {
        corrections.push({ icon: '⚖️', text: 'Press evenly with both arms — one side is lagging.' });
        score -= 15;
      }
      return { score: Math.max(score, 0), corrections };
    }
  },
  'Plank': {
    check(a) {
      const corrections = []; let score = 100;
      if (a.backLean !== null && a.backLean > 15) {
        corrections.push({ icon: '⚠️', text: 'Keep your hips in line with your shoulders — avoid sagging or piking.' });
        score -= 25;
      }
      return { score: Math.max(score, 0), corrections };
    }
  },
  'General Movement': {
    check() { return { score: null, corrections: [] }; }
  }
};

// Fully local replacement for analyzeForm() — no backend/Claude call
function analyzeForm(keypoints) {
  const exercise = classifyExercise(poseHistory);
  if (!exercise) return;

  const angles = getAngleValues(keypoints);
  const rule = EXERCISE_RULES[exercise] || EXERCISE_RULES['General Movement'];
  const { score, corrections } = rule.check(angles);

  let status = 'good';
  if (score !== null) status = score >= 80 ? 'good' : score >= 50 ? 'warning' : 'bad';

  const summary = corrections.length
    ? `${corrections.length} form issue${corrections.length > 1 ? 's' : ''} detected`
    : (exercise === 'General Movement' ? 'Keep moving — analysing your exercise…' : 'Great form! Keep it up.');

  renderFormFeedback({ exercise, score, status, summary, corrections });
}

function renderFormFeedback(result) {
  // Exercise badge
  document.getElementById('detected-ex-name').textContent = result.exercise || 'Detecting…';

  // Score ring
  if (result.score !== null && result.score !== undefined) {
    const circ = 201;
    const pct  = result.score / 100;
    document.getElementById('score-arc').style.strokeDashoffset = circ - pct * circ;
    document.getElementById('score-arc').style.stroke = result.score >= 80 ? '#4CAF50' : result.score >= 50 ? '#FF9800' : '#ef5350';
    document.getElementById('score-num').textContent = result.score;
    document.getElementById('score-num').style.color = result.score >= 80 ? 'var(--green)' : result.score >= 50 ? 'var(--orange)' : 'var(--red)';
  } else {
    document.getElementById('score-num').textContent = '–';
  }

  document.getElementById('score-label').textContent  = result.exercise || '';
  document.getElementById('score-detail').textContent = result.summary  || '';

  // Status indicator
  setFeedback(result.status || 'good', result.exercise || 'Analysing…', result.summary || '');

  // Corrections
  const card = document.getElementById('corrections-card');
  const list = document.getElementById('corrections-list');
  if (result.corrections && result.corrections.length > 0) {
    card.style.display = '';
    list.innerHTML = result.corrections.map(c =>
      `<li class="correction-item"><span class="ci-icon">${c.icon || '⚠️'}</span><span>${c.text}</span></li>`
    ).join('');
  } else {
    card.style.display = result.status === 'good' ? 'block' : 'none';
    list.innerHTML = `<li class="correction-item"><span class="ci-icon">✅</span><span>Great form! Keep it up.</span></li>`;
  }
}

function setFeedback(status, title, body) {
  const statusEl = document.getElementById('feedback-status');
  const titleEl  = document.getElementById('feedback-title');
  const bodyEl   = document.getElementById('feedback-body');
  statusEl.className = `feedback-status ${status}`;
  titleEl.textContent = title;
  bodyEl.textContent  = body;
}

// ════════════════════════════════════════════════════
// TRAINING DATA COLLECTION MODE
// Logs labeled angle-feature rows to build a dataset for
// training a local classifier (e.g. scikit-learn RandomForest)
// ════════════════════════════════════════════════════

function toggleLabeling() {
  isLabeling = !isLabeling;
  document.getElementById('label-toggle-btn').textContent = isLabeling ? '⏸ Stop Logging' : 'Start Logging';
  lastLogTime = 0;
}

// Called every animation frame from startAnalysisLoop(); throttles internally
function logTrainingFrame(keypoints) {
  if (!isLabeling) return;
  const now = Date.now();
  if (now - lastLogTime < LOG_INTERVAL_MS) return;
  lastLogTime = now;

  const a = getAngleValues(keypoints);
  const exercise = document.getElementById('label-exercise').value;
  const quality  = document.getElementById('label-quality').value;

  trainingRows.push({
    exercise, quality,
    leftElbow: a.leftElbow, rightElbow: a.rightElbow,
    leftKnee: a.leftKnee, rightKnee: a.rightKnee,
    leftHip: a.leftHip, rightHip: a.rightHip,
    leftShoulder: a.leftShoulder, rightShoulder: a.rightShoulder,
    backLean: a.backLean, avgHip: a.avgHip, avgKnee: a.avgKnee,
    avgElbow: a.avgElbow, avgShoulder: a.avgShoulder,
    hipAsymmetry: a.hipAsymmetry, kneeAsymmetry: a.kneeAsymmetry
  });
  document.getElementById('label-count').textContent = trainingRows.length;
}

function downloadTrainingCSV() {
  if (!trainingRows.length) { showToast('No data logged yet'); return; }
  const headers = Object.keys(trainingRows[0]);
  const csv = [headers.join(',')]
    .concat(trainingRows.map(r => headers.map(h => r[h] ?? '').join(',')))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `fitx_training_data_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
