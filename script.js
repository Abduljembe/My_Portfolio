const form = document.getElementById('ip-form');
const input = document.getElementById('ip-input');
const statusText = document.getElementById('status');
const resultCard = document.getElementById('result');
const resultList = document.getElementById('result-list');
const historyList = document.getElementById('history-list');
const lookupButton = document.getElementById('lookup-btn');
const myIpButton = document.getElementById('my-ip-btn');
const clearHistoryButton = document.getElementById('clear-history-btn');

const HISTORY_KEY = 'ip-tracker-history';
const MAX_HISTORY = 8;

const fields = [
  ['IP', 'ip'],
  ['Network', 'network'],
  ['Version', 'version'],
  ['City', 'city'],
  ['Region', 'region'],
  ['Country', 'country_name'],
  ['Timezone', 'timezone'],
  ['Coordinates', 'coordinates'],
  ['Organization', 'org'],
  ['ASN', 'asn']
];

const ipv4Part = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const ipv4Regex = new RegExp(`^(${ipv4Part}\\.){3}${ipv4Part}$`);
const ipv6Regex = /^[0-9A-Fa-f:]+$/;

function isIpLike(value) {
  return ipv4Regex.test(value) || (value.includes(':') && ipv6Regex.test(value));
}

function setStatus(message, isError = false) {
  statusText.textContent = message;
  statusText.classList.toggle('error', isError);
}

function clearResult() {
  resultList.innerHTML = '';
  resultCard.classList.add('hidden');
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(entries) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
}

function formatDate(isoDate) {
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString();
}

function renderHistory() {
  const history = getHistory();
  historyList.innerHTML = '';

  if (history.length === 0) {
    historyList.innerHTML = '<li class="empty">No IP lookups yet.</li>';
    return;
  }

  for (const entry of history) {
    const item = document.createElement('li');
    item.className = 'history-item';
    item.innerHTML = `
      <strong>${entry.ip}</strong>
      <span class="history-meta">${entry.country || 'N/A'} • ${entry.org || 'N/A'} • ${formatDate(entry.trackedAt)}</span>
    `;
    historyList.appendChild(item);
  }
}

function addToHistory(data) {
  const history = getHistory().filter((entry) => entry.ip !== data.ip);
  history.unshift({
    ip: data.ip,
    country: data.country_name,
    org: data.org,
    trackedAt: new Date().toISOString()
  });
  saveHistory(history);
  renderHistory();
}

function makeCoordinates(data) {
  if (data.latitude == null || data.longitude == null) {
    return 'N/A';
  }
  return `${data.latitude}, ${data.longitude}`;
}

function renderResult(data) {
  resultList.innerHTML = '';
  const enriched = {
    ...data,
    coordinates: makeCoordinates(data)
  };

  for (const [label, key] of fields) {
    const value = enriched[key] ?? 'N/A';
    const row = document.createElement('div');
    row.className = 'result-row';
    row.innerHTML = `<dt>${label}</dt><dd>${value}</dd>`;
    resultList.appendChild(row);
  }

  resultCard.classList.remove('hidden');
}

async function fetchIpData(ip) {
  const response = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.reason || 'IP lookup failed.');
  }

  return data;
}

async function trackIp(ip) {
  if (!isIpLike(ip)) {
    setStatus('Please enter a valid IPv4 or IPv6 address.', true);
    return;
  }

  setStatus('Tracking IP metadata...');
  lookupButton.disabled = true;
  myIpButton.disabled = true;

  try {
    const data = await fetchIpData(ip);
    renderResult(data);
    addToHistory(data);
    setStatus('Tracking complete.');
  } catch (error) {
    clearResult();
    setStatus(`Unable to fetch IP data: ${error.message}`, true);
  } finally {
    lookupButton.disabled = false;
    myIpButton.disabled = false;
  }
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  await trackIp(input.value.trim());
});

myIpButton.addEventListener('click', async () => {
  setStatus('Detecting your current public IP...');
  lookupButton.disabled = true;
  myIpButton.disabled = true;

  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data.ip) {
      throw new Error('Could not detect current IP.');
    }

    input.value = data.ip;
    await trackIp(data.ip);
  } catch (error) {
    setStatus(`Unable to detect current IP: ${error.message}`, true);
  } finally {
    lookupButton.disabled = false;
    myIpButton.disabled = false;
  }
});

clearHistoryButton.addEventListener('click', () => {
  saveHistory([]);
  renderHistory();
  setStatus('Tracking history cleared.');
});

renderHistory();
