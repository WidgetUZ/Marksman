// static/js/script.js
import { WEAPON_DATA } from './data.js';
import { BallisticCalculator } from './ballistics.js';

// --- Elementy DOM ---
const weaponSelect = document.getElementById('weaponSelect');
const caliberSelect = document.getElementById('caliberSelect');
const distanceInput = document.getElementById('distance');
const windSpeedInput = document.getElementById('windSpeed');
const windAngleInput = document.getElementById('windAngle');
const windAngleValueSpan = document.getElementById('windAngleValue');
const elevationFeetInput = document.getElementById('elevationFeet');
const zeroDistanceInput = document.getElementById('zeroDistance');
const calculateBtn = document.getElementById('calculateBtn');
const fireBtn = document.getElementById('fireBtn'); // Nowy przycisk "Strzel"
const levelSelect = document.getElementById('levelSelect'); // Wybór poziomu
const timerDisplay = document.getElementById('timerDisplay'); // Licznik czasu dla trybu zaawansowanego
const feedbackMessageDiv = document.getElementById('feedbackMessage'); // Wiadomości zwrotne
const reticleCanvas = document.getElementById('reticleCanvas');
const spotterCanvas = document.getElementById('spotterCanvas'); // Nowy canvas dla spottera
const ctxReticle = reticleCanvas.getContext('2d');
const ctxSpotter = spotterCanvas.getContext('2d');
const targetInfoDisplay = document.getElementById('targetInfoDisplay'); // Okienko info o celu
const resultsCard = document.getElementById('resultsCard');
const verticalOffsetSpan = document.getElementById('verticalOffset');
const horizontalOffsetSpan = document.getElementById('horizontalOffset');
const verticalMilsSpan = document.getElementById('verticalMils');
const horizontalMilsSpan = document.getElementById('horizontalMils');

// Obraz siatki mildot - to będzie tło rysowane w canvasie
let mildotImage = new Image();
mildotImage.src = 'static/images/mildot_reticle.png'; // Upewnij się, że masz ten obrazek!
mildotImage.onload = () => {
    drawReticle(); // Narysuj siatkę po załadowaniu
};


// --- Zmienne Stanu Symulatora ---
let currentWeaponData = null;
let currentCaliberData = null;
let ballisticCalculator = null;
let timerInterval = null;
let timeLeft = 10;
let isAdvancedMode = false;
let currentTarget = { type: 'none', image: null, mask: null, initialSize: 0 }; // Dane o aktualnym celu

// --- Konfiguracja siatki Mildot (dostosuj do Twojego obrazka!) ---
// To są arbitralne wartości. Musisz je zmierzyć na swoim obrazku!
// Jeśli Twój obrazek siatki Mildot ma np. 500x500 pikseli
// i reprezentuje pole widzenia +/- 5 MILs (czyli razem 10 MILs)
const MILS_PER_SIDE = 5; // Ile Mils jest od centrum do krawędzi obrazka (pionowo/poziomo)
const MIL_GRID_SPACING_MILS = 1; // Odległość między kropkami Mildot w Milach (zazwyczaj 1 Mil)


// --- Funkcje pomocnicze ---
function updateWeaponAndCaliber() {
    const selectedWeaponName = weaponSelect.value;
    const selectedCaliberName = caliberSelect.value;

    currentWeaponData = WEAPON_DATA[selectedWeaponName];
    currentCaliberData = currentWeaponData.calibers[selectedCaliberName];

    ballisticCalculator = new BallisticCalculator(
        currentCaliberData.muzzle_velocity_fps,
        currentCaliberData.ballistic_coefficient_g1,
        currentCaliberData.bullet_weight_grains,
        currentCaliberData.sight_height_inches
    );
    // Ustawia kąt zerowania lunety dla wybranego karabinu
    const zeroDist = parseFloat(zeroDistanceInput.value);
    ballisticCalculator.setZeroAngle(zeroDist);
    drawReticle(); // Odśwież siatkę (np. powiększenie)
}

function populateWeaponSelect() {
    weaponSelect.innerHTML = '';
    for (const weapon in WEAPON_DATA) {
        const option = document.createElement('option');
        option.value = weapon;
        option.textContent = weapon;
        weaponSelect.appendChild(option);
    }
    populateCaliberSelect();
}

function populateCaliberSelect() {
    caliberSelect.innerHTML = '';
    const selectedWeapon = weaponSelect.value;
    if (selectedWeapon && WEAPON_DATA[selectedWeapon]) {
        const calibers = WEAPON_DATA[selectedWeapon].calibers;
        for (const caliber in calibers) {
            const option = document.createElement('option');
            option.value = caliber;
            option.textContent = caliber;
            caliberSelect.appendChild(option);
        }
    }
    updateWeaponAndCaliber(); // Zaktualizuj kalkulator po zmianie kalibru
}

// Funkcja do rysowania siatki Mildot na canvasie
function drawReticle() {
    const canvasWidth = reticleCanvas.width;
    const canvasHeight = reticleCanvas.height;
    ctxReticle.clearRect(0, 0, canvasWidth, canvasHeight);

    // Rysowanie tła (obrazka Mildot)
    if (mildotImage.complete && mildotImage.naturalWidth > 0) {
        ctxReticle.drawImage(mildotImage, 0, 0, canvasWidth, canvasHeight);
    } else {
        // Jeśli obrazek się nie załadował, narysuj prostą siatkę
        ctxReticle.strokeStyle = 'rgba(0,0,0,0.7)';
        ctxReticle.lineWidth = 1;
        ctxReticle.beginPath();
        // Poziome linie
        for (let i = -MILS_PER_SIDE; i <= MILS_PER_SIDE; i += MIL_GRID_SPACING_MILS) {
            const y = canvasHeight / 2 + i * (canvasHeight / (MILS_PER_SIDE * 2)) ; // Przelicz Mils na piksele
            ctxReticle.moveTo(0, y);
            ctxReticle.lineTo(canvasWidth, y);
        }
        // Pionowe linie
        for (let i = -MILS_PER_SIDE; i <= MILS_PER_SIDE; i += MIL_GRID_SPACING_MILS) {
            const x = canvasWidth / 2 + i * (canvasWidth / (MILS_PER_SIDE * 2)); // Przelicz Mils na piksele
            ctxReticle.moveTo(x, 0);
            ctxReticle.lineTo(x, canvasHeight);
        }
        ctxReticle.stroke();
        ctxReticle.closePath();
    }

    // Narysuj centralny punkt (POA - Point of Aim)
    ctxReticle.beginPath();
    ctxReticle.arc(canvasWidth / 2, canvasHeight / 2, 3, 0, Math.PI * 2);
    ctxReticle.fillStyle = 'red';
    ctxReticle.fill();
    ctxReticle.closePath();

    // Rysowanie celu
    if (currentTarget.image && currentTarget.image.complete && currentTarget.image.naturalWidth > 0) {
        // Skalowanie celu na podstawie odległości i powiększenia lunety
        const distance = parseFloat(distanceInput.value);
        const scopeMagnification = currentCaliberData ? currentCaliberData.scope_magnification : 1; // Domyślne powiększenie 1x

        // Uproszczona formuła skalowania celu: im dalej cel, tym mniejszy.
        // Powiększenie lunety sprawia, że cel jest większy.
        // Liczba 100 to odległość bazowa w jardach, na której cel ma "initialSize"
        const targetVisualPxWidth = (currentTarget.initialSize / MIL_TO_INCHES_AT_100_YARDS) * (reticleCanvas.width / (MILS_PER_SIDE * 2)) * (scopeMagnification / 10);
        const targetVisualPxHeight = targetVisualPxWidth * (currentTarget.image.naturalHeight / currentTarget.image.naturalWidth);

        ctxReticle.drawImage(
            currentTarget.image,
            (canvasWidth / 2) - (targetVisualPxWidth / 2),
            (canvasHeight / 2) - (targetVisualPxHeight / 2),
            targetVisualPxWidth,
            targetVisualPxHeight
        );
    }
}

// Funkcja do rysowania punktu trafienia na siatce
function drawHitPoint(verticalMils, horizontalMils, color = 'green', radius = 5) {
    const canvasWidth = reticleCanvas.width;
    const canvasHeight = reticleCanvas.height;

    // Przelicz Mils na piksele na canvasie
    // Skala pikseli na Mil
    const pxPerMilX = (canvasWidth / (MILS_PER_SIDE * 2));
    const pxPerMilY = (canvasHeight / (MILS_PER_SIDE * 2));

    // Pozycja trafienia od centrum
    const hitX = canvasWidth / 2 + horizontalMils * pxPerMilX;
    const hitY = canvasHeight / 2 - verticalMils * pxPerMilY; // Oś Y w canvasie rośnie w dół, więc odejmujemy dla "góra"

    ctxReticle.beginPath();
    ctxReticle.arc(hitX, hitY, radius, 0, Math.PI * 2);
    ctxReticle.fillStyle = color;
    ctxReticle.fill();
    ctxReticle.closePath();
}

// Funkcja do symulacji trzęsienia lunety
function shakeReticle() {
    const originalTransform = reticleCanvas.style.transform;
    let shakeAmount = 5; // Piksele
    let duration = 200; // ms
    let startTime = Date.now();

    function animateShake() {
        const elapsed = Date.now() - startTime;
        if (elapsed < duration) {
            const randomX = (Math.random() - 0.5) * shakeAmount;
            const randomY = (Math.random() - 0.5) * shakeAmount;
            reticleCanvas.style.transform = `translate(${randomX}px, ${randomY}px)`;
            requestAnimationFrame(animateShake);
        } else {
            reticleCanvas.style.transform = originalTransform; // Powrót do pozycji
        }
    }
    animateShake();
}

// Funkcja do przełączania widoku (snajper/spotter)
function switchViewToSpotter(hitDetails) {
    reticleCanvas.style.display = 'none';
    spotterCanvas.style.display = 'block';
    
    // Rysowanie widoku spottera
    ctxSpotter.clearRect(0, 0, spotterCanvas.width, spotterCanvas.height);
    
    // Narysuj powiększony cel na widoku spottera
    if (currentTarget.image && currentTarget.image.complete && currentTarget.image.naturalWidth > 0) {
        // Powiększenie celu na widoku spottera
        const spotterTargetWidth = spotterCanvas.width * 0.9;
        const spotterTargetHeight = spotterTargetWidth * (currentTarget.image.naturalHeight / currentTarget.image.naturalWidth);

        const targetX = (spotterCanvas.width - spotterTargetWidth) / 2;
        const targetY = (spotterCanvas.height - spotterTargetHeight) / 2;

        ctxSpotter.drawImage(
            currentTarget.image,
            targetX,
            targetY,
            spotterTargetWidth,
            spotterTargetHeight
        );

        // Narysuj punkt trafienia na widoku spottera
        // Przelicz cale na piksele na canvasie spottera
        // Założenie: 1 cal = X pikseli na widoku spottera
        // Tu zależy od tego, jak duży jest cel i jak bardzo chcesz go powiększyć.
        // Jeśli cel na spotterCanvas ma 90% szerokości, a jego bazowy rozmiar to initialSize cali,
        // to 1 cal = (spotterTargetWidth / currentTarget.initialSize) pikseli
        const pxPerInchSpotterX = spotterTargetWidth / currentTarget.initialSize; // Przykładowo
        const pxPerInchSpotterY = spotterTargetHeight / currentTarget.initialSize;

        const hitXSpotter = targetX + (spotterTargetWidth / 2) + (hitDetails.horizontal_offset_inches * pxPerInchSpotterX);
        const hitYSpotter = targetY + (spotterTargetHeight / 2) - (hitDetails.vertical_offset_inches * pxPerInchSpotterY); // Oś Y w dół

        ctxSpotter.beginPath();
        ctxSpotter.arc(hitXSpotter, hitYSpotter, 8, 0, Math.PI * 2);
        ctxSpotter.fillStyle = 'blue'; // Kolor przestrzeliny
        ctxSpotter.fill();
        ctxSpotter.closePath();

        // Sprawdź trafienie na masce w trybie zaawansowanym
        if (isAdvancedMode && currentTarget.mask && currentTarget.mask.complete) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = currentTarget.mask.naturalWidth;
            tempCanvas.height = currentTarget.mask.naturalHeight;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(currentTarget.mask, 0, 0);

            // Przelicz pozycję trafienia na koordynaty maski
            // Skalowanie z widoku spottera na rozmiar maski
            const maskToSpotterRatioX = currentTarget.mask.naturalWidth / spotterTargetWidth;
            const maskToSpotterRatioY = currentTarget.mask.naturalHeight / spotterTargetHeight;

            const hitXOnMask = (hitXSpotter - targetX) * maskToSpotterRatioX;
            const hitYOnMask = (hitYSpotter - targetY) * maskToSpotterRatioY;

            if (hitXOnMask >= 0 && hitXOnMask < tempCanvas.width &&
                hitYOnMask >= 0 && hitYOnMask < tempCanvas.height) {
                const pixelData = tempCtx.getImageData(hitXOnMask, hitYOnMask, 1, 1).data;
                // Sprawdź kolor piksela (biały = trafiony, czarny = pudło)
                if (pixelData[0] > 200 && pixelData[1] > 200 && pixelData[2] > 200) {
                    feedbackMessageDiv.textContent = "CEL ZLIKWIDOWANY!";
                    feedbackMessageDiv.style.color = "green";
                    clearInterval(timerInterval); // Zatrzymanie licznika
                    fireBtn.disabled = true; // Zablokuj dalsze strzały
                } else {
                    feedbackMessageDiv.textContent = "PUDŁO! (Trafienie poza białym obszarem)";
                    feedbackMessageDiv.style.color = "orange";
                    startTimer(); // Daj 10s na poprawkę
                }
            } else {
                feedbackMessageDiv.textContent = "PUDŁO! (Trafienie poza celem)";
                feedbackMessageDiv.style.color = "red";
                startTimer(); // Daj 10s na poprawkę
            }
        } else if (isAdvancedMode) {
             feedbackMessageDiv.textContent = "PUDŁO! (Brak maski celu)";
             feedbackMessageDiv.style.color = "red";
             startTimer(); // Daj 10s na poprawkę
        }
    } else {
        ctxSpotter.font = '24px Arial';
        ctxSpotter.fillStyle = 'red';
        ctxSpotter.textAlign = 'center';
        ctxSpotter.fillText('Błąd: Brak obrazu celu!', spotterCanvas.width / 2, spotterCanvas.height / 2);
    }


    // Dodaj tekst z informacją o trafieniu
    ctxSpotter.font = '20px Arial';
    ctxSpotter.fillStyle = 'black';
    ctxSpotter.textAlign = 'center';
    ctxSpotter.fillText(`Trafiono! Pionowo: ${hitDetails.vertical_offset_inches.toFixed(2)}", Poziomo: ${hitDetails.horizontal_offset_inches.toFixed(2)}"`, spotterCanvas.width / 2, 30);

    // Przycisk "Kolejna Seria" / "Nowa Runda"
    let nextRoundBtn = spotterCanvas.parentNode.querySelector('#nextRoundBtn');
    if (!nextRoundBtn) {
        nextRoundBtn = document.createElement('button');
        nextRoundBtn.id = 'nextRoundBtn';
        spotterCanvas.parentNode.appendChild(nextRoundBtn);
    }
    nextRoundBtn.textContent = isAdvancedMode ? 'Nowa Runda' : 'Kolejna Seria';
    nextRoundBtn.onclick = () => {
        resetSimulator();
        switchViewToSniper();
        if (isAdvancedMode) {
            startAdvancedRound();
        } else {
            startTrainingRound();
        }
    };
    nextRoundBtn.style.display = 'block';
}

function switchViewToSniper() {
    reticleCanvas.style.display = 'block';
    spotterCanvas.style.display = 'none';
    feedbackMessageDiv.textContent = '';
    const nextRoundBtn = spotterCanvas.parentNode.querySelector('#nextRoundBtn');
    if (nextRoundBtn) nextRoundBtn.style.display = 'none';
}

function resetSimulator() {
    clearInterval(timerInterval);
    timerDisplay.textContent = '';
    fireBtn.disabled = false;
    feedbackMessageDiv.textContent = '';
    feedbackMessageDiv.style.color = "black";
    drawReticle(); // Wyczyść punkt trafienia i odśwież cel
}

function startTimer() {
    clearInterval(timerInterval);
    timeLeft = 10;
    timerDisplay.textContent = `Czas: ${timeLeft}s`;
    timerDisplay.style.color = "black";

    timerInterval = setInterval(() => {
        timeLeft--;
        timerDisplay.textContent = `Czas: ${timeLeft}s`;
        if (timeLeft <= 3) {
            timerDisplay.style.color = "red";
        }
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            feedbackMessageDiv.textContent = "Koniec czasu! Cel uciekł...";
            feedbackMessageDiv.style.color = "red";
            fireBtn.disabled = true; // Zablokuj strzał

            // Dodaj opcję nowej rundy
            let nextRoundBtn = spotterCanvas.parentNode.querySelector('#nextRoundBtn');
            if (!nextRoundBtn) {
                nextRoundBtn = document.createElement('button');
                nextRoundBtn.id = 'nextRoundBtn';
                spotterCanvas.parentNode.appendChild(nextRoundBtn);
            }
            nextRoundBtn.textContent = 'Nowa Runda';
            nextRoundBtn.onclick = () => {
                resetSimulator();
                switchViewToSniper();
                startAdvancedRound();
            };
            nextRoundBtn.style.display = 'block';
        }
    }, 1000);
}

// Funkcja do ładowania celu i maski
function loadTarget(targetName, callback) {
    const targetImage = new Image();
    const targetMask = new Image();
    let loadedCount = 0;

    const onImageLoad = () => {
        loadedCount++;
        if (loadedCount === 2) { // Obie grafiki załadowane
            currentTarget.image = targetImage;
            currentTarget.mask = targetMask;
            if (callback) callback();
        }
    };

    targetImage.onload = onImageLoad;
    targetMask.onload = onImageLoad;

    targetImage.src = `static/images/${targetName}.png`;
    targetMask.src = `static/images/${targetName}-mask.png`;
}


function startTrainingRound() {
    isAdvancedMode = false;
    timerDisplay.style.display = 'none';

    // Wybierz losowy cel treningowy (tarcza_okragla lub gong)
    const targets = [
        { name: 'target_round', initialSize: 20 }, // Przykładowo 20 cali średnicy
        { name: 'target_gong', initialSize: 12 }   // Przykładowo 12 cali średnicy
    ];
    const randomTarget = targets[Math.floor(Math.random() * targets.length)];

    loadTarget(randomTarget.name, () => {
        currentTarget.type = 'training';
        currentTarget.initialSize = randomTarget.initialSize;
        drawReticle(); // Rysuj nowy cel
    });
    
    // Losuj odległość (np. 100-1000 jardów) i wiatr (0-20 mph)
    distanceInput.value = (Math.random() * 900 + 100).toFixed(0);
    windSpeedInput.value = (Math.random() * 20).toFixed(1);
    windAngleInput.value = Math.floor(Math.random() * 181); // 0 do 180
    windAngleValueSpan.textContent = `${windAngleInput.value}°`;
    elevationFeetInput.value = (Math.random() * 200 - 100).toFixed(0); // -100 do +100 stóp

    targetInfoDisplay.textContent = `Cel: ${distanceInput.value} jardów, Wiatr: ${windSpeedInput.value} mph (${windAngleInput.value}°), Elewacja: ${elevationFeetInput.value} stóp.`;
    feedbackMessageDiv.textContent = "Tryb Treningowy - strzelaj do celu.";
}

function startAdvancedRound() {
    isAdvancedMode = true;
    timerDisplay.style.display = 'block';

    loadTarget('target_human', () => { // Ładujemy obrazek ludzkiego celu i maskę
        currentTarget.type = 'human';
        currentTarget.initialSize = 70; // Przykładowa bazowa wysokość człowieka w calach
        drawReticle();
    });

    // Losuj odległość (np. 300-1200 jardów) i wiatr (5-25 mph)
    distanceInput.value = (Math.random() * 900 + 300).toFixed(0);
    windSpeedInput.value = (Math.random() * 20 + 5).toFixed(1);
    windAngleInput.value = Math.floor(Math.random() * 181);
    windAngleValueSpan.textContent = `${windAngleInput.value}°`;
    elevationFeetInput.value = (Math.random() * 300 - 150).toFixed(0);

    targetInfoDisplay.textContent = `Cel: ${distanceInput.value} jardów, Wiatr: ${windSpeedInput.value} mph (${windAngleInput.value}°), Elewacja: ${elevationFeetInput.value} stóp.`;
    feedbackMessageDiv.textContent = "Tryb Zaawansowany - zneutralizuj cel!";

    startTimer(); // Rozpocznij odliczanie
}

// --- Obsługa Zdarzeń ---
document.addEventListener('DOMContentLoaded', () => {
    populateWeaponSelect();
    updateWeaponAndCaliber(); // Ustaw początkowy kalkulator

    // Domyślny start w trybie treningowym
    levelSelect.value = 'training';
    startTrainingRound();
});

weaponSelect.addEventListener('change', populateCaliberSelect);
caliberSelect.addEventListener('change', updateWeaponAndCaliber);
windAngleInput.addEventListener('input', () => {
    windAngleValueSpan.textContent = `${windAngleInput.value}°`;
});

levelSelect.addEventListener('change', () => {
    isAdvancedMode = (levelSelect.value === 'advanced');
    resetSimulator();
    if (isAdvancedMode) {
        startAdvancedRound();
    } else {
        startTrainingRound();
    }
});

calculateBtn.addEventListener('click', () => {
    if (!ballisticCalculator) {
        alert("Wybierz karabin i kaliber!");
        return;
    }

    const distance = parseFloat(distanceInput.value);
    const windSpeed = parseFloat(windSpeedInput.value);
    const windAngle = parseFloat(windAngleInput.value);
    const elevationFeet = parseFloat(elevationFeetInput.value);
    const zeroDistance = parseFloat(zeroDistanceInput.value);

    // Zaktualizuj zerowanie lunety, jeśli się zmieniło
    ballisticCalculator.setZeroAngle(zeroDistance);

    // Oblicz efektywną odległość dla opadu
    const effectiveDistance = ballisticCalculator.calculateEffectiveRange(elevationFeet, distance);

    // Oblicz trajektorię
    const { hitYInches, hitZInches } = ballisticCalculator.calculateTrajectory(
        effectiveDistance, zeroDistance, windSpeed, windAngle
    );

    // Ponieważ calculateTrajectory zwraca przesunięcie od linii lufy,
    // musimy dostosować to do punktu celowania (POA), biorąc pod uwagę zerowanie i wysokość lunety.
    // Opad od POA = hitYInches (od linii lufy) + wysokość lunety
    const finalVerticalOffsetInches = hitYInches + ballisticCalculator.sightHeightInches;
    const finalHorizontalOffsetInches = hitZInches; // Wiatr to już przesunięcie od POA poziomo

    const verticalMils = ballisticCalculator.inchesToMils(finalVerticalOffsetInches, distance);
    const horizontalMils = ballisticCalculator.inchesToMils(finalHorizontalOffsetInches, distance);

    verticalOffsetSpan.textContent = finalVerticalOffsetInches.toFixed(2);
    horizontalOffsetSpan.textContent = finalHorizontalOffsetInches.toFixed(2);
    verticalMilsSpan.textContent = verticalMils.toFixed(2);
    horizontalMilsSpan.textContent = horizontalMils.toFixed(2);

    resultsCard.style.display = 'block';
    drawReticle(); // Odśwież widok
    // Draw "ghost" hit point for calculated point
    drawHitPoint(verticalMils, horizontalMils);
});

fireBtn.addEventListener('click', () => {
    if (!ballisticCalculator) {
        alert("Wybierz karabin i kaliber!");
        return;
    }

    shakeReticle(); // Symulacja odrzutu
    fireBtn.disabled = true; // Zablokuj strzał do czasu końca symulacji/resetu
    clearInterval(timerInterval); // Zatrzymuje timer po pierwszym strzale, jeśli trwa

    const distance = parseFloat(distanceInput.value);
    const windSpeed = parseFloat(windSpeedInput.value);
    const windAngle = parseFloat(windAngleInput.value);
    const elevationFeet = parseFloat(elevationFeetInput.value);
    const zeroDistance = parseFloat(zeroDistanceInput.value);

    ballisticCalculator.setZeroAngle(zeroDistance); // Upewnij się, że zerowanie jest aktualne

    const effectiveDistance = ballisticCalculator.calculateEffectiveRange(elevationFeet, distance);

    // Wykonaj obliczenia dla strzału
    const { hitYInches, hitZInches } = ballisticCalculator.calculateTrajectory(
        effectiveDistance, zeroDistance, windSpeed, windAngle
    );

    const finalVerticalOffsetInches = hitYInches + ballisticCalculator.sightHeightInches;
    const finalHorizontalOffsetInches = hitZInches;

    const verticalMils = ballisticCalculator.inchesToMils(finalVerticalOffsetInches, distance);
    const horizontalMils = ballisticCalculator.inchesToMils(finalHorizontalOffsetInches, distance);

    // Po krótkiej chwili, pokaż widok spottera
    setTimeout(() => {
        switchViewToSpotter({
            vertical_offset_inches: finalVerticalOffsetInches,
            horizontal_offset_inches: finalHorizontalOffsetInches,
            vertical_mils: verticalMils,
            horizontal_mils: horizontalMils
        });
    }, 500); // Czas na symulację odrzutu
});

// Nasłuchiwanie zmian w polach wejściowych, aby odświecić info o celu
[distanceInput, windSpeedInput, windAngleInput, elevationFeetInput].forEach(input => {
    input.addEventListener('input', () => {
        targetInfoDisplay.textContent = `Cel: ${distanceInput.value} jardów, Wiatr: ${windSpeedInput.value} mph (${windAngleInput.value}°), Elewacja: ${elevationFeetInput.value} stóp.`;
    });
});
