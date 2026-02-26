const form = document.getElementById('ip-form');
const input = document.getElementById('ip-input');
const statusText = document.getElementById('status');
const resultCard = document.getElementById('result');
const resultList = document.getElementById('result-list');

const fields = [
  ['IP', 'ip'],
  ['Network', 'network'],
  ['Version', 'version'],
  ['City', 'city'],
  ['Region', 'region'],
  ['Country', 'country_name'],
  ['Timezone', 'timezone'],
  ['Organization', 'org'],
  ['ASN', 'asn']
];

const ipv4Part = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const ipv4Regex = new RegExp(`^(${ipv4Part}\\.){3}${ipv4Part}$`);
const ipv6Regex = /^[0-9a-fA-F:]+$/;

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

function renderResult(data) {
  resultList.innerHTML = '';

  for (const [label, key] of fields) {
    const value = data[key] ?? 'N/A';
    const row = document.createElement('div');
    row.className = 'result-row';
    row.innerHTML = `<dt>${label}</dt><dd>${value}</dd>`;
    resultList.appendChild(row);
  }

  resultCard.classList.remove('hidden');
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearResult();

  const ip = input.value.trim();
  if (!isIpLike(ip)) {
    setStatus('Please enter a valid IPv4 or IPv6 address.', true);
    return;
  }

  setStatus('Loading IP metadata...');
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.disabled = true;

  try {
    const response = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`);
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.reason || 'IP lookup failed.');
    }

    renderResult(data);
    setStatus('Lookup complete.');
  } catch (error) {
    setStatus(`Unable to fetch IP data: ${error.message}`, true);
  } finally {
    submitButton.disabled = false;
  }
});
