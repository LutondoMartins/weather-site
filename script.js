// Configuração e variáveis globais
const API_KEY = '04313188717c7656469bb8ea7cbfee8e'; // Chave da OpenWeatherMap API
const UNSPLASH_ACCESS_KEY = 'an0keG93seTt9rdX8ilMfVH1o5OLGByQpBVDZtYoq0I'; // Chave da Unsplash API
let recentLocations = JSON.parse(localStorage.getItem('recentLocations')) || [];
let currentTimezoneOffset = 0; // Armazena o deslocamento de fuso horário em segundos

// Elementos DOM
const searchInput = document.getElementById('search-input');
const searchLoader = document.getElementById('search-loader');
const errorMessage = document.getElementById('error-message');
const cityName = document.getElementById('city-name');
const regionName = document.getElementById('region-name');
const currentTime = document.getElementById('current-time');
const currentDate = document.getElementById('current-date');
const currentTemp = document.getElementById('current-temp');
const currentConditionIcon = document.getElementById('current-condition-icon');
const currentConditionText = document.getElementById('current-condition-text');
const todayForecast = document.getElementById('today-forecast');
const weekForecast = document.getElementById('week-forecast');
const cityView = document.getElementById('city-view');
const recentLocationsContainer = document.getElementById('recent-locations');
const todayTab = document.getElementById('today-tab');
const weekTab = document.getElementById('week-tab');

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Tentar obter localização atual
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude, longitude } = position.coords;
                getWeatherData(null, latitude, longitude);
            },
            error => {
                console.error('Geolocation error:', error);
                // Fallback para São Francisco se a geolocalização falhar
                getWeatherData('San Francisco');
            }
        );
    } else {
        // Fallback para São Francisco se o navegador não suportar geolocalização
        getWeatherData('San Francisco');
    }

    // Configurar busca
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const searchTerm = this.value.trim();
            if (searchTerm !== '') {
                searchWeather(searchTerm);
            }
        }
    });

    // Configurar navegação de abas
    todayTab.addEventListener('click', function() {
        todayTab.classList.add('tab-active');
        weekTab.classList.remove('tab-active');
        todayForecast.classList.remove('hidden');
        weekForecast.classList.add('hidden');
    });

    weekTab.addEventListener('click', function() {
        weekTab.classList.add('tab-active');
        todayTab.classList.remove('tab-active');
        weekForecast.classList.remove('hidden');
        todayForecast.classList.add('hidden');
    });

    // Atualizar hora atual inicialmente
    updateCurrentDateTime();
    setInterval(updateCurrentDateTime, 60000); // Atualiza a cada minuto

    // Adaptar para diferentes tamanhos de tela
    handleResponsiveLayout();
    window.addEventListener('resize', handleResponsiveLayout);

    // Carregar locais recentes
    updateRecentLocationsUI();
});

// Função principal de busca
function searchWeather(city) {
    showLoader();
    hideError();
    getWeatherData(city);
}

// Obter dados de clima da API
function getWeatherData(city, lat, lon) {
    let url;
    if (city) {
        url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;
    } else if (lat && lon) {
        url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
    } else {
        throw new Error('City or coordinates required');
    }

    // Buscar dados atuais do clima
    fetch(url)
        .then(response => {
            if (!response.ok) {
                throw new Error('City not found');
            }
            return response.json();
        })
        .then(data => {
            // Processar dados atuais
            updateCurrentWeather(data);
            
            // Adicionar à lista de locais recentes
            addToRecentLocations(data.name, data.sys.country);
            
            // Buscar previsão de 5 dias
            let forecastUrl;
            if (city) {
                forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`;
            } else {
                forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`;
            }
            return fetch(forecastUrl);
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Forecast not found');
            }
            return response.json();
        })
        .then(forecastData => {
            // Processar dados de previsão
            updateForecast(forecastData);
            
            // Buscar imagem da cidade
            getCityImage(city || forecastData.city.name, forecastData.city.country || '');
            
            hideLoader();
        })
        .catch(error => {
            console.error('Error fetching weather data:', error);
            showError();
            hideLoader();
        });
}

// Obter imagem da cidade da API Unsplash
function getCityImage(city, country) {
    // Primeiro tentar buscar por pontos turísticos da cidade
    fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(city)}+landmark&orientation=landscape&client_id=${UNSPLASH_ACCESS_KEY}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Unsplash API error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.results && data.results.length > 0) {
                const imageUrl = data.results[0].urls.regular;
                cityView.style.backgroundImage = `url('${imageUrl}')`;
            } else {
                // Tentar busca por "cityscape"
                return fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(city)}+cityscape&orientation=landscape&client_id=${UNSPLASH_ACCESS_KEY}`);
            }
        })
        .then(response => {
            if (response) {
                return response.json();
            }
        })
        .then(data => {
            if (data && data.results && data.results.length > 0) {
                const imageUrl = data.results[0].urls.regular;
                cityView.style.backgroundImage = `url('${imageUrl}')`;
            } else if (country) {
                // Tentar o país
                return fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(country)}+landmark&orientation=landscape&client_id=${UNSPLASH_ACCESS_KEY}`);
            } else {
                throw new Error('No country available');
            }
        })
        .then(response => {
            if (response) {
                return response.json();
            }
        })
        .then(data => {
            if (data && data.results && data.results.length > 0) {
                const imageUrl = data.results[0].urls.regular;
                cityView.style.backgroundImage = `url('${imageUrl}')`;
            } else {
                // Imagem fallback
                cityView.style.backgroundImage = `url('https://via.placeholder.com/800x500?text=${encodeURIComponent(city)}+Image+Not+Found')`;
            }
        })
        .catch(error => {
            console.error('Error fetching city image:', error);
            cityView.style.backgroundImage = `url('https://via.placeholder.com/800x500?text=${encodeURIComponent(city)}+Image+Not+Found')`;
        });
}

// Atualizar informações de clima atual
function updateCurrentWeather(data) {
    const temp = Math.round(data.main.temp);
    const condition = data.weather[0].main;
    const icon = getWeatherIcon(data.weather[0].icon);
    
    cityName.textContent = data.name || 'Unknown';
    regionName.textContent = data.sys.country || 'Unknown';
    currentTemp.textContent = `${temp}°`;
    currentConditionIcon.innerHTML = icon;
    currentConditionText.textContent = condition;
    
    // Armazenar o deslocamento de fuso horário
    currentTimezoneOffset = data.timezone || 0; // Em segundos
    // Atualizar a hora/data imediatamente
    updateCurrentDateTime();
    
    // Alternar classes de estilo se for noite
    if (data.weather[0].icon.includes('n')) {
        cityView.classList.add('night-mode');
    } else {
        cityView.classList.remove('night-mode');
    }
}

// Atualizar previsão
function updateForecast(data) {
    // Limpar containers
    todayForecast.innerHTML = '';
    weekForecast.innerHTML = '';
    
    // Previsão de hoje (próximas 5 horas)
    const now = new Date();
    const todayForecasts = data.list
        .filter(item => new Date(item.dt * 1000) > now)
        .slice(0, 5); // Pegar as próximas 5 previsões
    
    todayForecasts.forEach(item => {
        const hour = new Date(item.dt * 1000).toLocaleTimeString([], {hour: 'numeric', minute: '2-digit'});
        const temp = Math.round(item.main.temp);
        const icon = getWeatherIcon(item.weather[0].icon);
        const humidity = item.main.humidity;
        const wind = (item.wind.speed * 3.6).toFixed(1); // Converter m/s para km/h
        
        todayForecast.innerHTML += `
            <div class="flex justify-between items-center">
                <div class="text-gray-600 text-sm sm:text-base">${hour}</div>
                <div class="flex items-center">
                    <div class="weather-icon-small mr-2">${icon}</div>
                    <div class="text-gray-600 text-sm sm:text-base">
                        <span>${temp}°</span>
                        <span class="text-xs ml-2">💧 ${humidity}%</span>
                        <span class="text-xs ml-2">💨 ${wind} km/h</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    // Previsão da semana (próximos 5 dias)
    const dailyData = {};
    
    // Agrupar por dia
    data.list.forEach(item => {
        const timestamp = item.dt * 1000;
        const dateKey = new Date(timestamp).toISOString().split('T')[0]; // Formato YYYY-MM-DD
        
        if (!dailyData[dateKey]) {
            dailyData[dateKey] = {
                timestamp: timestamp,
                temps: [item.main.temp],
                max: item.main.temp_max,
                min: item.main.temp_min,
                icon: item.weather[0].icon
            };
        } else {
            dailyData[dateKey].temps.push(item.main.temp);
            if (item.main.temp_max > dailyData[dateKey].max) {
                dailyData[dateKey].max = item.main.temp_max;
            }
            if (item.main.temp_min < dailyData[dateKey].min) {
                dailyData[dateKey].min = item.main.temp_min;
            }
        }
    });
    
    // Criar elementos para a previsão semanal
    Object.entries(dailyData).slice(0, 5).forEach(([dateKey, forecast]) => {
        const date = new Date(forecast.timestamp);
        const dayName = date.toLocaleDateString('pt-BR', {weekday: 'long'});
        const icon = getWeatherIcon(forecast.icon);
        
        weekForecast.innerHTML += `
            <div class="flex justify-between items-center">
                <div class="text-gray-600 text-sm sm:text-base capitalize">${dayName}</div>
                <div class="flex items-center">
                    <div class="weather-icon-small mr-2">${icon}</div>
                    <span class="text-gray-600 text-sm sm:text-base">
                        <span class="font-medium">${Math.round(forecast.max)}°</span>
                        <span class="text-gray-400 ml-1">${Math.round(forecast.min)}°</span>
                    </span>
                </div>
            </div>
        `;
    });
}

// Obter ícone SVG para condição climática
function getWeatherIcon(code) {
    const iconMap = {
        '01d': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-yellow-400">
            <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.844a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
        </svg>`,
        '01n': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-gray-400">
            <path fill-rule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clip-rule="evenodd" />
        </svg>`,
        '02d': `<div class="flex">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-yellow-400">
                <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.844a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-gray-300 -ml-4">
                <path d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.23-10.004 6.072 6.072 0 01-.02-.496z" />
            </svg>
        </div>`,
        '02n': `<div class="flex">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-gray-400">
                <path fill-rule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clip-rule="evenodd" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-gray-300 -ml-4">
                <path d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.23-10.004 6.072 6.072 0 01-.02-.496z" />
            </svg>
        </div>`,
        '03d': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-gray-400">
            <path d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.23-10.004 6.072 6.072 0 01-.02-.496z" />
        </svg>`,
        '03n': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-gray-400">
            <path d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.23-10.004 6.072 6.072 0 01-.02-.496z" />
        </svg>`,
        '04d': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-gray-500">
            <path d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.23-10.004 6.072 6.072 0 01-.02-.496z" />
        </svg>`,
        '04n': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-gray-500">
            <path d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.23-10.004 6.072 6.072 0 01-.02-.496z" />
        </svg>`,
        '09d': `<div class="flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-blue-300">
                <path d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.23-10.004 6.072 6.072 0 01-.02-.496z" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-blue-500 w-4 h-4 -mt-2">
                <path fill-rule="evenodd" d="M12 5.25c1.213 0 2.415.046 3.605.135a3.256 3.256 0 013.01 3.01c.044.583.077 1.17.1 1.759L17.03 8.47a.75.75 0 10-1.06 1.06l3 3a.75.75 0 001.06 0l3-3a.75.75 0 00-1.06-1.06l-1.752 1.751c-.023-.65-.06-1.296-.108-1.939a4.756 4.756 0 00-4.392-4.392 49.422 49.422 0 00-7.436 0A4.756 4.756 0 003.89 8.282c-.017.224-.033.447-.046.672a.75.75 0 001.5 0c-.01-.2-.021-.398-.03-.596a3.32 3.32 0 00-.053-.447 3.256 3.256 0 00-3.01-3.01A49.324 49.324 0 0012 5.25z" clip-rule="evenodd" />
            </svg>
        </div>`,
        '09n': `<div class="flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-blue-300">
                <path d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.23-10.004 6.072 6.072 0 01-.02-.496z" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-blue-500 w-4 h-4 -mt-2">
                <path fill-rule="evenodd" d="M12 5.25c1.213 0 2.415.046 3.605.135a3.256 3.256 0 013.01 3.01c.044.583.077 1.17.1 1.759L17.03 8.47a.75.75 0 10-1.06 1.06l3 3a.75.75 0 001.06 0l3-3a.75.75 0 00-1.06-1.06l-1.752 1.751c-.023-.65-.06-1.296-.108-1.939a4.756 4.756 0 00-4.392-4.392 49.422 49.422 0 00-7.436 0A4.756 4.756 0 003.89 8.282c-.017.224-.033.447-.046.672a.75.75 0 001.5 0c-.01-.2-.021-.398-.03-.596a3.32 3.32 0 00-.053-.447 3.256 3.256 0 00-3.01-3.01A49.324 49.324 0 0012 5.25z" clip-rule="evenodd" />
            </svg>
        </div>`,
        '10d': `<div class="flex flex-col items-center">
            <div class="flex">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-yellow-400">
                    <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.844a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a.75.75 0 01.75.75V21a.75.75 0 01-1.5 0v-2.25A.75.75 0 0112 18zM7.758 17.303a.75.75 0 00-1.061-1.06l-1.591 1.59a.75.75 0 001.06 1.061l1.591-1.59zM6 12a.75.75 0 01-.75.75H3a.75.75 0 010-1.5h2.25A.75.75 0 016 12zM6.697 7.757a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 00-1.061 1.06l1.59 1.591z" />
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-blue-300 -ml-4">
                    <path d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.23-10.004 6.072 6.072 0 01-.02-.496z" />
                </svg>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-blue-500 w-4 h-4 -mt-2">
                <path fill-rule="evenodd" d="M12 5.25c1.213 0 2.415.046 3.605.135a3.256 3.256 0 013.01 3.01c.044.583.077 1.17.1 1.759L17.03 8.47a.75.75 0 10-1.06 1.06l3 3a.75.75 0 001.06 0l3-3a.75.75 0 00-1.06-1.06l-1.752 1.751c-.023-.65-.06-1.296-.108-1.939a4.756 4.756 0 00-4.392-4.392 49.422 49.422 0 00-7.436 0A4.756 4.756 0 003.89 8.282c-.017.224-.033.447-.046.672a.75.75 0 001.5 0c-.01-.2-.021-.398-.03-.596a3.32 3.32 0 00-.053-.447 3.256 3.256 0 00-3.01-3.01A49.324 49.324 0 0012 5.25z" clip-rule="evenodd" />
            </svg>
        </div>`,
        '10n': `<div class="flex flex-col items-center">
            <div class="flex">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-gray-400">
                    <path fill-rule="evenodd" d="M9.528 1.718a.75.75 0 01.162.819A8.97 8.97 0 009 6a9 9 0 009 9 8.97 8.97 0 003.463-.69.75.75 0 01.981.98 10.503 10.503 0 01-9.694 6.46c-5.799 0-10.5-4.701-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 01.818.162z" clip-rule="evenodd" />
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-blue-300 -ml-4">
                    <path d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.23-10.004 6.072 6.072 0 01-.02-.496z" />
                </svg>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-blue-500 w-4 h-4 -mt-2">
                <path fill-rule="evenodd" d="M12 5.25c1.213 0 2.415.046 3.605.135a3.256 3.256 0 013.01 3.01c.044.583.077 1.17.1 1.759L17.03 8.47a.75.75 0 10-1.06 1.06l3 3a.75.75 0 001.06 0l3-3a.75.75 0 00-1.06-1.06l-1.752 1.751c-.023-.65-.06-1.296-.108-1.939a4.756 4.756 0 00-4.392-4.392 49.422 49.422 0 00-7.436 0A4.756 4.756 0 003.89 8.282c-.017.224-.033.447-.046.672a.75.75 0 001.5 0c-.01-.2-.021-.398-.03-.596a3.32 3.32 0 00-.053-.447 3.256 3.256 0 00-3.01-3.01A49.324 49.324 0 0012 5.25z" clip-rule="evenodd" />
            </svg>
        </div>`,
        '11d': `<div class="flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-gray-500">
                <path d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.23-10.004 6.072 6.072 0 01-.02-.496z" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-yellow-500 w-4 h-4 -mt-2">
                <path fill-rule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clip-rule="evenodd" />
            </svg>
        </div>`,
        '11n': `<div class="flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-gray-500">
                <path d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.23-10.004 6.072 6.072 0 01-.02-.496z" />
            </svg>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-yellow-500 w-4 h-4 -mt-2">
                <path fill-rule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l-10.5-11.25a.75.75 0 01.913-.143z" clip-rule="evenodd" />
            </svg>
        </div>`,
        '13d': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-blue-100">
            <path d="M11.625 16.5a1.875 1.875 0 100-3.75 1.875 1.875 0 000 3.75z" />
            <path fill-rule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zm6 16.5c.66 0 1.277-.19 1.797-.518l1.048 1.048a.75.75 0 001.06-1.06l-1.047-1.048A3.375 3.375 0 1011.625 18z" clip-rule="evenodd" />
            <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
        </svg>`,
        '13n': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-blue-100">
            <path d="M11.625 16.5a1.875 1.875 0 100-3.75 1.875 1.875 0 000 3.75z" />
            <path fill-rule="evenodd" d="M5.625 1.5H9a3.75 3.75 0 013.75 3.75v1.875c0 1.036.84 1.875 1.875 1.875H16.5a3.75 3.75 0 013.75 3.75v7.875c0 1.035-.84 1.875-1.875 1.875H5.625a1.875 1.875 0 01-1.875-1.875V3.375c0-1.036.84-1.875 1.875-1.875zm12 16.5c.66 0 1.277-.19 1.797-.518l1.048 1.048a.75.75 0 001.06-1.06l-1.047-1.048A3.375 3.375 0 1011.625 18z" clip-rule="evenodd" />
            <path d="M14.25 5.25a5.23 5.23 0 00-1.279-3.434 9.768 9.768 0 016.963 6.963A5.23 5.23 0 0016.5 7.5h-1.875a.375.375 0 01-.375-.375V5.25z" />
        </svg>`,
        '50d': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-gray-400">
            <path fill-rule="evenodd" d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.23-10.004 6.072 6.072 0 01-.02-.496z" clip-rule="evenodd" />
        </svg>`,
        '50n': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="text-gray-400">
            <path fill-rule="evenodd" d="M4.5 9.75a6 6 0 0111.573-2.226 3.75 3.75 0 014.133 4.303A4.5 4.5 0 0118 20.25H6.75a5.25 5.25 0 01-2.23-10.004 6.072 6.072 0 01-.02-.496z" clip-rule="evenodd" />
        </svg>`
    };
    return iconMap[code] || iconMap['01d'];
}

// Adicionar à lista de locais recentes
function addToRecentLocations(city, country) {
    if (!city || !country) return;
    const existingIndex = recentLocations.findIndex(loc => 
        loc.city === city && loc.country === country);
    
    if (existingIndex !== -1) {
        recentLocations.splice(existingIndex, 1);
    }
    
    recentLocations.unshift({
        city: city,
        country: country,
        timestamp: new Date().toISOString()
    });
    
    if (recentLocations.length > 5) {
        recentLocations.pop();
    }
    
    localStorage.setItem('recentLocations', JSON.stringify(recentLocations));
    updateRecentLocationsUI();
}

// Atualizar a UI de locais recentes
function updateRecentLocationsUI() {
    if (recentLocations.length === 0) {
        recentLocationsContainer.innerHTML = `
            <div class="text-gray-500 text-sm italic">Search for a city to see recent locations</div>
        `;
        return;
    }
    
    recentLocationsContainer.innerHTML = '';
    
    recentLocations.forEach(location => {
        const locationElement = document.createElement('div');
        locationElement.className = 'flex justify-between items-center recent-location p-2 rounded-md cursor-pointer';
        locationElement.innerHTML = `
            <div class="text-gray-800">${location.city}, ${location.country}</div>
            <div class="text-gray-500 text-xs">${formatRelativeTime(new Date(location.timestamp))}</div>
        `;
        
        locationElement.addEventListener('click', () => {
            searchWeather(location.city);
        });
        
        recentLocationsContainer.appendChild(locationElement);
    });
}

// Formatar tempo relativo
function formatRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffDay > 0) {
        return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;
    } else if (diffHour > 0) {
        return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
    } else if (diffMin > 0) {
        return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
    } else {
        return 'Just now';
    }
}

// Atualizar data e hora atual com fuso horário
function updateCurrentDateTime() {
    // Obter a data atual
    const now = new Date();
    // Ajustar para o fuso horário da cidade (currentTimezoneOffset em segundos)
    // Converter para UTC primeiro, depois adicionar o deslocamento da cidade
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
    const localTime = new Date(utcTime + (currentTimezoneOffset * 1000));
    
    // Formatar a data em pt-BR
    const dateOptions = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    };
    currentDate.textContent = localTime.toLocaleDateString('pt-BR', dateOptions);
    
    // Formatar a hora em 24h
    currentTime.textContent = localTime.toLocaleTimeString('pt-BR', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: false // Usar formato 24h
    });
}

// Manipular layout responsivo
function handleResponsiveLayout() {
    if (window.innerWidth < 640) {
        document.querySelector('.weather-card').classList.add('flex-col-reverse');
    } else {
        document.querySelector('.weather-card').classList.remove('flex-col-reverse');
    }
}

// Mostrar loader de busca
function showLoader() {
    searchLoader.style.display = 'block';
}

// Esconder loader de busca
function hideLoader() {
    searchLoader.style.display = 'none';
}

// Mostrar mensagem de erro
function showError() {
    errorMessage.style.display = 'block';
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 3000);
}

// Esconder mensagem de erro
function hideError() {
    errorMessage.style.display = 'none';
}