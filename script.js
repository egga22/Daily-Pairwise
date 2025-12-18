// Auth UI elements
const authSection = document.getElementById('auth-section');
const authContainer = document.getElementById('auth-container');
const authForm = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const authSubmit = document.getElementById('auth-submit');
const authError = document.getElementById('auth-error');
const loginTab = document.getElementById('login-tab');
const signupTab = document.getElementById('signup-tab');
const logoutButton = document.getElementById('logout-button');
const userInfo = document.getElementById('user-info');

// Ranking UI elements
const itemsInput = document.getElementById('items-input');
const startButton = document.getElementById('start-button');
const optionAButton = document.getElementById('option-a');
const optionBButton = document.getElementById('option-b');
const restartButton = document.getElementById('restart-button');
const inputSection = document.getElementById('input-section');
const comparisonSection = document.getElementById('comparison-section');
const resultsSection = document.getElementById('results-section');
const resultsList = document.getElementById('results-list');
const errorMessage = document.getElementById('error-message');
const progressText = document.getElementById('progress');
const progressBar = document.getElementById('progress-bar');
const progressFill = document.getElementById('progress-fill');
const statsToggle = document.getElementById('stats-toggle');
const statsPanel = document.getElementById('stats-panel');

// Auth state
let isLogin = true;
let currentUser = null;

// Ranking state
let items = [];
let sortedItems = [];
let currentIndex = 0;
let currentItem = '';
let low = 0;
let high = 0;
let mid = 0;
let totalSteps = 0;
let completedSteps = 0;

startButton.addEventListener('click', () => {
  const parsed = parseItems(itemsInput.value);

  if (parsed.length === 0) {
    showError('Please provide at least one item to rank.');
    return;
  }

  hideError();
  items = parsed;
  beginRanking();
});

optionAButton.addEventListener('click', () => {
  // The current item wins the comparison.
  markComparisonComplete();
  high = mid;
  nextStep();
});

optionBButton.addEventListener('click', () => {
  // The existing ranked item stays ahead.
  markComparisonComplete();
  low = mid + 1;
  nextStep();
});

restartButton.addEventListener('click', resetApp);

if (statsToggle && statsPanel) {
  statsToggle.addEventListener('click', () => {
    const isHidden = statsPanel.classList.toggle('hidden');
    statsToggle.setAttribute('aria-expanded', String(!isHidden));

    if (!isHidden) {
      updateStatsPanel();
    }
  });
}

itemsInput.addEventListener('input', updateStatsPanel);

// Auth event listeners
loginTab.addEventListener('click', () => {
  isLogin = true;
  loginTab.classList.add('active');
  signupTab.classList.remove('active');
  authSubmit.textContent = 'Sign In';
  hideAuthError();
});

signupTab.addEventListener('click', () => {
  isLogin = false;
  signupTab.classList.add('active');
  loginTab.classList.remove('active');
  authSubmit.textContent = 'Sign Up';
  hideAuthError();
});

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  hideAuthError();
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  if (!email || !password) {
    showAuthError('Please enter both email and password.');
    return;
  }
  
  authSubmit.disabled = true;
  authSubmit.textContent = isLogin ? 'Signing in...' : 'Signing up...';
  
  try {
    if (isLogin) {
      await window.firebaseAuthFunctions.signInWithEmailAndPassword(window.firebaseAuth, email, password);
    } else {
      await window.firebaseAuthFunctions.createUserWithEmailAndPassword(window.firebaseAuth, email, password);
    }
    // Auth state change will handle UI updates
  } catch (error) {
    let message = 'An error occurred. Please try again.';
    
    if (error.code === 'auth/email-already-in-use') {
      message = 'This email is already in use. Please sign in instead.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Invalid email address.';
    } else if (error.code === 'auth/weak-password') {
      message = 'Password should be at least 6 characters.';
    } else if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
      message = 'Invalid email or password.';
    } else if (error.code === 'auth/invalid-credential') {
      message = 'Invalid email or password.';
    }
    
    showAuthError(message);
  } finally {
    authSubmit.disabled = false;
    authSubmit.textContent = isLogin ? 'Sign In' : 'Sign Up';
  }
});

logoutButton.addEventListener('click', async () => {
  try {
    await window.firebaseAuthFunctions.signOut(window.firebaseAuth);
    resetApp();
  } catch (error) {
    console.error('Sign out error:', error);
  }
});

function parseItems(raw) {
  return raw
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}

function hideError() {
  errorMessage.textContent = '';
  errorMessage.classList.add('hidden');
}

function beginRanking() {
  inputSection.classList.add('hidden');
  comparisonSection.classList.add('hidden');
  resultsSection.classList.add('hidden');

  sortedItems = [];
  currentIndex = 0;

  initializeProgressTracking();

  if (items.length === 1) {
    sortedItems = [...items];
    currentIndex = items.length;
    showResults();
    return;
  }

  sortedItems = [items[0]];
  currentIndex = 1;
  prepareInsertion();
}

function prepareInsertion() {
  if (currentIndex >= items.length) {
    updateProgress();
    showResults();
    return;
  }

  currentItem = items[currentIndex];
  low = 0;
  high = sortedItems.length;
  comparisonSection.classList.remove('hidden');
  updateProgress();
  compareNext();
}

function nextStep() {
  if (low >= high) {
    sortedItems.splice(low, 0, currentItem);
    currentIndex += 1;
    prepareInsertion();
  } else {
    compareNext();
  }
}

function compareNext() {
  if (low >= high) {
    nextStep();
    return;
  }

  mid = Math.floor((low + high) / 2);
  optionAButton.textContent = currentItem;
  optionBButton.textContent = sortedItems[mid];
  updateProgress();
}

function updateProgress() {
  if (!items.length) {
    resetProgressVisual();
    progressText.textContent = '';
    return;
  }

  const total = items.length;
  const rankedCount = sortedItems.length;
  const completion = totalSteps
    ? Math.min(completedSteps / totalSteps, 1)
    : Math.min(rankedCount / total, 1);

  updateProgressVisual(completion);

  if (currentIndex >= total) {
    const noun = total === 1 ? 'item' : 'items';
    progressText.textContent = `All ${total} ${noun} ranked.`;
    return;
  }

  const humanIndex = Math.min(currentIndex + 1, total);
  const noun = rankedCount === 1 ? 'item' : 'items';
  progressText.textContent = `Ranking item ${humanIndex} of ${total}. ${rankedCount} ${noun} ranked so far.`;
}

function updateProgressVisual(ratio) {
  const clamped = Math.max(0, Math.min(ratio, 1));
  const percentage = Math.round(clamped * 100);

  if (progressFill) {
    progressFill.style.width = `${clamped * 100}%`;
  }

  if (progressBar) {
    progressBar.setAttribute('aria-valuenow', String(percentage));
    progressBar.setAttribute('aria-valuetext', `${percentage}% complete`);
  }
}

function resetProgressVisual() {
  if (progressFill) {
    progressFill.style.width = '0%';
  }

  if (progressBar) {
    progressBar.setAttribute('aria-valuenow', '0');
    progressBar.setAttribute('aria-valuetext', '0% complete');
  }
}

function showResults() {
  comparisonSection.classList.add('hidden');
  resultsSection.classList.remove('hidden');
  resultsList.innerHTML = '';

  if (totalSteps > 0) {
    completedSteps = totalSteps;
    updateProgress();
  }

  sortedItems.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    resultsList.appendChild(li);
  });
}

function resetApp() {
  items = [];
  sortedItems = [];
  currentIndex = 0;
  currentItem = '';
  low = 0;
  high = 0;
  mid = 0;
  totalSteps = 0;
  completedSteps = 0;
  itemsInput.value = '';
  resultsList.innerHTML = '';
  hideError();
  resetProgressVisual();
  progressText.textContent = '';

  resultsSection.classList.add('hidden');
  comparisonSection.classList.add('hidden');
  inputSection.classList.remove('hidden');

  if (statsPanel) {
    statsPanel.classList.add('hidden');
  }

  if (statsToggle) {
    statsToggle.setAttribute('aria-expanded', 'false');
  }

  updateStatsPanel();
  itemsInput.focus();
}

// Auth helper functions
function showAuthError(message) {
  authError.textContent = message;
  authError.classList.remove('hidden');
}

function hideAuthError() {
  authError.textContent = '';
  authError.classList.add('hidden');
}

function showAuthUI() {
  authSection.classList.remove('hidden');
  authContainer.classList.add('hidden');
  inputSection.classList.add('hidden');
  comparisonSection.classList.add('hidden');
  resultsSection.classList.add('hidden');
}

function showAppUI() {
  authSection.classList.add('hidden');
  authContainer.classList.remove('hidden');
  inputSection.classList.remove('hidden');
  itemsInput.focus();
}

function updateUserInfo(user) {
  if (user && user.email) {
    userInfo.textContent = `Signed in as: ${user.email}`;
  } else {
    userInfo.textContent = '';
  }
}

// Initialize auth state listener
function initializeAuth() {
  if (window.firebaseAuth && window.firebaseAuthFunctions) {
    window.firebaseAuthFunctions.onAuthStateChanged(window.firebaseAuth, (user) => {
      currentUser = user;
      
      if (user) {
        // User is signed in
        updateUserInfo(user);
        showAppUI();
      } else {
        // User is signed out
        showAuthUI();
        updateUserInfo(null);
      }
    });
  } else {
    // Firebase failed to load, show auth UI with error
    showAuthUI();
    showAuthError('Firebase authentication is not available. Please check your connection or browser settings.');
  }
}

// Wait for Firebase to be initialized
if (window.firebaseAuth) {
  initializeAuth();
} else {
  // Wait a bit for the module script to load
  setTimeout(() => {
    initializeAuth();
    updateStatsPanel();
  }, 500);
}

function initializeProgressTracking() {
  completedSteps = 0;

  if (!items.length) {
    totalSteps = 0;
    resetProgressVisual();
    progressText.textContent = '';
    return;
  }

  totalSteps = estimateTotalSteps(items.length);
  updateProgress();
}

function estimateTotalSteps(count) {
  if (count <= 1) {
    return 1;
  }

  let estimate = 0;

  for (let i = 1; i < count; i += 1) {
    estimate += Math.ceil(Math.log2(i + 1));
  }

  // Add an extra step for revealing the final results so we can always
  // smoothly reach 100%.
  return estimate + 1;
}

function markComparisonComplete() {
  if (!totalSteps) {
    return;
  }

  completedSteps = Math.min(completedSteps + 1, totalSteps);
  updateProgress();
}

const lengthDistributionCache = new Map();

function updateStatsPanel() {
  if (!statsPanel) {
    return;
  }

  const count = parseItems(itemsInput.value).length;

  if (count === 0) {
    statsPanel.innerHTML =
      '<p>Enter two or more items to estimate how many comparisons you will make.</p>';
    return;
  }

  const stats = calculateComparisonStats(count);

  if (count === 1) {
    statsPanel.innerHTML =
      '<p>Only one item provided, so no comparisons are needed.</p>';
    return;
  }

  const averageComparisons = formatDecimal(stats.comparisons.average);
  const minComparisons = stats.comparisons.min.toLocaleString();
  const maxComparisons = stats.comparisons.max.toLocaleString();
  const percentile90Comparisons = stats.comparisons.percentile90.toLocaleString();

  statsPanel.innerHTML = `
    <p><strong>${count.toLocaleString()}</strong> items typically require about <strong>${averageComparisons}</strong> pairwise decisions.</p>
    <ul>
      <li>Minimum: ${minComparisons} decisions</li>
      <li>Average: ${averageComparisons} decisions</li>
      <li>90th percentile: ${percentile90Comparisons} decisions</li>
      <li>Maximum: ${maxComparisons} decisions</li>
    </ul>
    <small>Estimates assume each new item is equally likely to end up in any position of the final ranking.</small>
  `;
}

function calculateComparisonStats(count) {
  if (count <= 0) {
    return null;
  }

  const distribution = buildTotalComparisonDistribution(count);
  const summary = summarizeDistribution(distribution);

  return {
    count,
    comparisons: summary,
  };
}

function buildTotalComparisonDistribution(count) {
  let distribution = new Map([[0, 1]]);

  for (let length = 1; length < count; length += 1) {
    const stepDistribution = comparisonsDistributionForLength(length);
    const nextDistribution = new Map();

    distribution.forEach((probability, total) => {
      stepDistribution.forEach((stepProbability, steps) => {
        const combined = total + steps;
        const existing = nextDistribution.get(combined) || 0;
        nextDistribution.set(combined, existing + probability * stepProbability);
      });
    });

    distribution = nextDistribution;
  }

  return distribution;
}

function comparisonsDistributionForLength(length) {
  if (lengthDistributionCache.has(length)) {
    return lengthDistributionCache.get(length);
  }

  const distribution = new Map();

  if (length <= 0) {
    distribution.set(0, 1);
    lengthDistributionCache.set(length, distribution);
    return distribution;
  }

  const denominator = length + 1;

  for (let target = 0; target <= length; target += 1) {
    const steps = comparisonsForInsertion(length, target);
    const current = distribution.get(steps) || 0;
    distribution.set(steps, current + 1 / denominator);
  }

  lengthDistributionCache.set(length, distribution);
  return distribution;
}

function comparisonsForInsertion(length, targetIndex) {
  let low = 0;
  let high = length;
  let steps = 0;

  while (low < high) {
    steps += 1;
    const mid = Math.floor((low + high) / 2);

    if (targetIndex <= mid) {
      high = mid;
    } else {
      low = mid + 1;
    }
  }

  return steps;
}

function summarizeDistribution(distribution) {
  const entries = Array.from(distribution.entries()).sort((a, b) => a[0] - b[0]);

  if (!entries.length) {
    return {
      min: 0,
      max: 0,
      average: 0,
      percentile90: 0,
    };
  }

  let average = 0;
  let percentile90 = entries[entries.length - 1][0];
  let cumulative = 0;

  entries.forEach(([value, probability]) => {
    average += value * probability;
  });

  for (let index = 0; index < entries.length; index += 1) {
    const [value, probability] = entries[index];
    cumulative += probability;

    if (cumulative >= 0.9) {
      percentile90 = value;
      break;
    }
  }

  return {
    min: entries[0][0],
    max: entries[entries.length - 1][0],
    average,
    percentile90,
  };
}

function formatDecimal(value) {
  const options = {
    maximumFractionDigits: 1,
  };

  if (Math.abs(value - Math.round(value)) < 0.05) {
    return Math.round(value).toLocaleString();
  }

  return value.toLocaleString(undefined, options);
}
