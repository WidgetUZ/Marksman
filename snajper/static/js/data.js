// static/js/data.js
// --- Przykładowe dane karabinów i pocisków ---
// Wartości są PRZYKŁADOWE i powinny być zastąpione rzeczywistymi danymi balistycznymi!
// Ballistic Coefficient (BC) najlepiej podawać jako G7, ale dla uproszczenia
// w kodzie nadal używamy uproszczonego modelu G1. Do precyzyjnych symulacji
// wymagane są tabele oporu dla G7 lub dokładne drag functions.

export const WEAPON_DATA = {
    "Sako TRG M10": {
        "calibers": {
            "308 Win (175gr)": { // Odpowiednik 7,62x51 NATO
                "muzzle_velocity_fps": 2600, // Typowa prędkość dla naboju 175gr
                "ballistic_coefficient_g1": 0.496, // Dla Sierra MatchKing 175gr (G1)
                "bullet_weight_grains": 175,
                "sight_height_inches": 1.5,
                "scope_magnification": 16 // Przykładowe powiększenie maksymalne
            },
            "338 Lapua Mag (250gr)": { // Odpowiednik 8,6x70mm
                "muzzle_velocity_fps": 2750, // Typowa prędkość dla naboju 250gr
                "ballistic_coefficient_g1": 0.675, // Dla Lapua Scenar 250gr (G1)
                "bullet_weight_grains": 250,
                "sight_height_inches": 1.5,
                "scope_magnification": 25 // Przykładowe powiększenie maksymalne
            }
        }
    },
    "KBW Bor 7,62x51": {
        "calibers": {
            "7,62x51 NATO (Lapua Scenar 180gr)": {
                "muzzle_velocity_fps": 2500,
                "ballistic_coefficient_g1": 0.508,
                "bullet_weight_grains": 180,
                "sight_height_inches": 1.7,
                "scope_magnification": 12
            }
        }
    },
    "WKBW Tor 12mm": { // .50 BMG
        "calibers": {
            ".50 BMG (M33 Ball 660gr)": { // 12.7x99mm
                "muzzle_velocity_fps": 2800,
                "ballistic_coefficient_g1": 1.050, // Dla M33 Ball (G1)
                "bullet_weight_grains": 660,
                "sight_height_inches": 2.0,
                "scope_magnification": 20
            }
        }
    },
    "MSBS Grot 7,62": { // Zakładamy wersję karabinu MSBS zasilaną amunicją 7,62x51
        "calibers": {
            "7,62x51 NATO (175gr)": {
                "muzzle_velocity_fps": 2500,
                "ballistic_coefficient_g1": 0.496,
                "bullet_weight_grains": 175,
                "sight_height_inches": 2.2,
                "scope_magnification": 8
            }
        }
    }
};

// Stałe fizyczne
export const GRAVITY_FPS2 = 32.174; // Przyspieszenie ziemskie w stopach/sekundę^2
export const AIR_DENSITY_SLUGS_PER_FT3 = 0.0023769; // Gęstość powietrza na poziomie morza, standardowa atmosfera

// Współczynniki konwersji
export const YARDS_TO_FEET = 3;
export const MPH_TO_FPS = 5280 / 3600;
export const FEET_TO_INCHES = 12;
export const MIL_TO_INCHES_AT_100_YARDS = 3.6; // 1 Mil = 3.6 cala na 100 jardach
export const MIL_TO_RADIANS = 0.001; // 1 Miliradian = 0.001 Radian
