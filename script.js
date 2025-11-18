/* ===============================
   CONSTANTS AND ELEMENTS
================================ */
const API_KEY = "5c61b6a469a8e66b54f1031f2def5023";

const input = document.getElementById("city-input");
const suggestions = document.getElementById("suggestions");
const weatherDisplay = document.getElementById("weather-display");
const forecastDisplay = document.getElementById("forecast-display");
const hourlyContainer = document.getElementById("hourly-container");
const weeklyTempChartEl = document.getElementById("weeklyTempChart");
const precipChartEl = document.getElementById("precipChart");
const themeToggle = document.getElementById("theme-toggle");
const unitToggle = document.getElementById("unit-toggle");
const unitIcon = document.getElementById("unit-icon");
const toastContainer = document.getElementById("toast-container");
const addFavBtn = document.getElementById("add-favorite");
const favToggleBtn = document.getElementById("favorites-toggle");
const favoritesDrawer = document.getElementById("favorites-drawer");
const drawerOverlay = document.getElementById("drawer-overlay");
const closeFavBtn = document.getElementById("close-fav");

let isCelsius = localStorage.getItem("unit") !== "F";
let currentCity = null;
let favorites = JSON.parse(localStorage.getItem("favorites") || "[]");
let weeklyTempChart, precipChart;
let suggestDebounce = null;

/* ===============================
   UTILITY FUNCTIONS
================================ */
function showToast(msg) {
    const toast = document.createElement("div");
    toast.className = "toast glass";
    toast.innerHTML = `<span>${msg}</span><button>&times;</button>`;
    toast.querySelector("button").onclick = () => toast.remove();
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

function cToF(temp) { return Math.round((temp * 9/5) + 32); }
function fToC(temp) { return Math.round((temp - 32) * 5/9); }

function clearWeatherUI() {
    weatherDisplay.innerHTML = `<p class="placeholder">Search a city to view weather.</p>`;
    forecastDisplay.innerHTML = "";
    hourlyContainer.innerHTML = "";
    try { if (weeklyTempChart) { weeklyTempChart.destroy(); weeklyTempChart = null; } } catch(e){}
    try { if (precipChart) { precipChart.destroy(); precipChart = null; } } catch(e){}
}

/* ===============================
   AUTO SUGGEST + DEBOUNCE
================================ */
input.addEventListener("input", () => {
    const q = input.value.trim();
    if (q.length === 0) { suggestions.innerHTML = ""; clearWeatherUI(); return; }
    if (q.length < 2) { suggestions.innerHTML = ""; return; }

    if (suggestDebounce) clearTimeout(suggestDebounce);
    suggestDebounce = setTimeout(() => fetchCitySuggestions(q), 300);
});

async function fetchCitySuggestions(q) {
    try {
        const res = await fetch(
            `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}&limit=6&appid=${API_KEY}`
        );
        if (!res.ok) throw new Error("Failed to fetch city suggestions");
        const data = await res.json();

        suggestions.innerHTML = "";
        if (!data.length) return suggestions.innerHTML = `<div class="suggest-item">No cities found</div>`;

        data.forEach(city => {
            const formatted = `${city.name}${city.state ? ", "+city.state : ""}, ${city.country}`;
            const item = document.createElement("div");
            item.className = "suggest-item";
            item.textContent = formatted;

            item.onclick = () => {
                input.value = formatted;
                suggestions.innerHTML = "";
                loadCityWeather(formatted);
            };

            suggestions.appendChild(item);
        });
    } catch (err) { 
        console.error(err); 
        showToast(err.message); 
    }
}

document.addEventListener("click", e => {
    if (!suggestions.contains(e.target) && e.target !== input) suggestions.innerHTML = "";
});

/* ===============================
   SEARCH BUTTON + ENTER KEY
================================ */
document.getElementById("search-btn").addEventListener("click", () => {
    const city = input.value.trim();
    if (!city) return showToast("Enter city name!");
    loadCityWeather(city);
});

input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        const city = input.value.trim();
        if (!city) return showToast("Enter city name!");
        loadCityWeather(city);
        suggestions.innerHTML = "";
    }
});

/* ===============================
   THEME TOGGLE
================================ */
function updateThemeIcon() {
    const themeIcon = document.getElementById("theme-icon");
    themeIcon.textContent = document.body.classList.contains("dark") ? "light_mode" : "dark_mode";
}

themeToggle.onclick = () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
    updateThemeIcon();
};

/* ===============================
   UNIT TOGGLE
================================ */
function updateUnitUI() {
    unitIcon.textContent = isCelsius ? "thermostat" : "ac_unit";
}

unitToggle.onclick = () => {
    isCelsius = !isCelsius;
    localStorage.setItem("unit", isCelsius ? "C" : "F");
    updateUnitUI();
    if (currentCity) loadCityWeather(currentCity);
};

/* ===============================
   FAVORITES MANAGEMENT
================================ */
addFavBtn.onclick = () => {
    if (!currentCity) return showToast("No loaded city to save");
    if (!favorites.includes(currentCity)) {
        favorites.push(currentCity);
        localStorage.setItem("favorites", JSON.stringify(favorites));
        showToast(`${currentCity} added to favorites`);
        renderFavorites();
    } else {
        showToast(`${currentCity} already in favorites`);
    }
};

function removeFavorite(city) {
    favorites = favorites.filter(c => c !== city);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    renderFavorites();
}

function renderFavorites() {
    const list = document.getElementById("favorites-list");
    list.innerHTML = "";
    if (!favorites.length) return list.innerHTML = `<p class="placeholder">No favorites yet</p>`;

    favorites.forEach(city => {
        const div = document.createElement("div");
        div.className = "favorite-city glass";

        div.innerHTML = `
            <span>${city}</span>
            <div class="fav-actions">
                <button class="glass-btn small-btn" data-remove>remove</button>
            </div>
        `;

        div.querySelector("span").onclick = () => {
            input.value = city;
            loadCityWeather(city);
            toggleFavorites(false);
        };

        div.querySelector("[data-remove]").onclick = (e) => {
            e.stopPropagation();
            removeFavorite(city);
        };

        list.appendChild(div);
    });
}

renderFavorites();

/* ===============================
   FAVORITES DRAWER UI
================================ */
function toggleFavorites(open) {
    if (open) {
        favoritesDrawer.classList.remove("hidden");
        favoritesDrawer.classList.add("open");
        drawerOverlay.classList.remove("hidden");
    } else {
        favoritesDrawer.classList.add("hidden");
        favoritesDrawer.classList.remove("open");
        drawerOverlay.classList.add("hidden");
    }
}

favToggleBtn.onclick = () => toggleFavorites(true);
closeFavBtn.onclick = () => toggleFavorites(false);
drawerOverlay.onclick = () => toggleFavorites(false);

/* ===============================
   LOAD CITY WEATHER (validated save)
================================ */
async function loadCityWeather(city) {
    try {
        const [current, forecastData] = await Promise.all([
            getCurrentWeather(city),
            getForecast(city)
        ]);

        currentCity = `${current.name}, ${current.sys.country}`;
        localStorage.setItem("lastCity", currentCity);

        displayHourlyForecast(forecastData);
        renderWeeklyChart(forecastData);
        renderPrecipChart(forecastData);

    } catch (err) {
        console.error(err);
        showToast(err.message || "Failed to load city");
    }
}

/* ===============================
   CURRENT WEATHER
================================ */
async function getCurrentWeather(city) {
    try {
        const res = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
        );
        if (!res.ok) throw new Error("City not found");
        const data = await res.json();
        displayCurrentWeather(data);
        return data;
    } catch (err) {
        weatherDisplay.innerHTML = `<p class="placeholder error">⚠️ ${err.message}</p>`;
        throw err;
    }
}

function displayCurrentWeather(d) {
    let temp = Math.round(d.main.temp);
    let feelsLike = Math.round(d.main.feels_like);

    if (!isCelsius) {
        temp = cToF(temp);
        feelsLike = cToF(feelsLike);
    }

    let unit = isCelsius ? "°C" : "°F";

    weatherDisplay.innerHTML = `
        <h3>${d.name}, ${d.sys.country}</h3>
        <img src="https://openweathermap.org/img/wn/${d.weather[0].icon}@2x.png" />
        <h2>${temp}${unit}</h2>
        <p class="description">${d.weather[0].description}</p>
        <div class="weather-details">
            <p><strong>Humidity:</strong> ${d.main.humidity}%</p>
            <p><strong>Wind:</strong> ${d.wind.speed} m/s</p>
            <p><strong>Feels Like:</strong> ${feelsLike}${unit}</p>
        </div>
    `;
}

/* ===============================
   FORECAST (3-hour intervals)
================================ */
async function getForecast(city) {
    try {
        const res = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`
        );
        if (!res.ok) throw new Error("Forecast not available");
        const data = await res.json();
        displayForecast(data.list);
        return data.list;
    } catch (err) {
        forecastDisplay.innerHTML = `<p class="placeholder error">⚠️ ${err.message}</p>`;
        throw err;
    }
}

function displayForecast(list) {
    if (!Array.isArray(list) || list.length === 0)
        return forecastDisplay.innerHTML = `<p class="placeholder">No forecast data</p>`;

    forecastDisplay.innerHTML = "";
    let days = {};

    list.forEach(item => {
        const date = item.dt_txt.split(" ")[0];
        if (!days[date]) days[date] = item;
    });

    Object.keys(days).slice(0,5).forEach(date => {
        const d = days[date];
        let temp = Math.round(d.main.temp);
        if (!isCelsius) temp = cToF(temp);
        let unit = isCelsius ? "°C" : "°F";

        const readable = new Date(date).toLocaleDateString(
            "en-US",
            { weekday:"long", month:"short", day:"numeric" }
        );

        forecastDisplay.innerHTML += `
            <div class="forecast-card glass">
                <h4>${readable}</h4>
                <img src="https://openweathermap.org/img/wn/${d.weather[0].icon}@2x.png">
                <p class="temp">${temp}${unit}</p>
                <p>${d.weather[0].description}</p>
                <p>Humidity: ${d.main.humidity}%</p>
                <p>Wind: ${d.wind.speed} m/s</p>
            </div>
        `;
    });
}

/* ===============================
   HOURLY FORECAST
================================ */
function displayHourlyForecast(list) {
    if (!Array.isArray(list) || !list.length) {
        hourlyContainer.innerHTML = "";
        return;
    }

    hourlyContainer.innerHTML = "";
    const next8 = list.slice(0, 8);

    next8.forEach(item => {
        let temp = Math.round(item.main.temp);
        if (!isCelsius) temp = cToF(temp);
        let unit = isCelsius ? "°C" : "°F";

        const time = new Date(item.dt_txt)
            .toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});

        const div = document.createElement("div");
        div.className = "hour-card glass";
        div.innerHTML = `
            <p>${time}</p>
            <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}@2x.png">
            <p>${temp}${unit}</p>
        `;
        hourlyContainer.appendChild(div);
    });
}

/* ===============================
   WEEKLY TEMP CHART
================================ */
function renderWeeklyChart(list) {
    if (!Array.isArray(list) || !list.length) return;

    let daily = {};
    list.forEach(item => {
        const date = item.dt_txt.split(" ")[0];
        if (!daily[date]) daily[date] = [];
        daily[date].push(item.main.temp);
    });

    const labels = Object.keys(daily)
        .slice(0,7)
        .map(d => new Date(d).toLocaleDateString("en-US", {weekday:"short"}));

    const data = Object.values(daily)
        .slice(0,7)
        .map(arr =>{
            const avg = arr.reduce((a,b)=>a+b,0) / arr.length;
            return isCelsius ? Math.round(avg) : cToF(Math.round(avg));
        });

    if (weeklyTempChart) weeklyTempChart.destroy();

    weeklyTempChart = new Chart(weeklyTempChartEl, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Avg Temp",
                data,
                borderColor:"#0f1c2e",
                backgroundColor:"rgba(15,28,46,0.2)",
                tension:0.3
            }]
        },
        options: { responsive:true, plugins:{legend:{display:true}} }
    });
}

/* ===============================
   PRECIPITATION CHART
================================ */
function renderPrecipChart(list) {
    if (!Array.isArray(list) || !list.length) return;

    const next8 = list.slice(0,8);
    const labels = next8.map(i =>
        new Date(i.dt_txt).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})
    );
    const data = next8.map(i => (i.pop || 0) * 100);

    if (precipChart) precipChart.destroy();

    precipChart = new Chart(precipChartEl, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label:"Precipitation %",
                data,
                backgroundColor:"rgba(15,28,46,0.5)"
            }]
        },
        options:{
            responsive:true,
            plugins:{legend:{display:true}},
            scales:{y:{beginAtZero:true, max:100}}
        }
    });
}

/* ===============================
   ON LOAD
================================ */
window.addEventListener("load", () => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") document.body.classList.add("dark");
    updateThemeIcon();
    updateUnitUI();
    renderFavorites();

    const saved = localStorage.getItem("lastCity");
    if (saved) {
        input.value = saved;
        loadCityWeather(saved).catch(()=>{});
    } else {
        clearWeatherUI();
    }
});
