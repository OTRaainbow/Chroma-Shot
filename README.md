# 🎯 Chroma Shot

**Chroma Shot** is a fast-paced, precision shooter game where you must match colored projectiles with moving targets. Test your reflexes, unlock achievements, and defeat bosses in this neon-soaked arcade experience!

## 🎮 Play Now

*   **Web Version:** [https://chroma-shot.vercel.app/](https://chroma-shot.vercel.app/)
*   **Telegram Bot:** [@chromaShot_bot](https://t.me/chromaShot_bot)

---

## 🕹️ How to Play

1.  **Select Color:** Tap the colored buttons at the bottom (or use the mouse wheel) to switch your projectile color.
2.  **Aim & Shoot:** Tap anywhere on the upper screen to launch a ball.
3.  **Match:** You must hit targets with the **same color** ball.
    *   ✅ **Match:** Points + Streak increase.
    *   ❌ **Mismatch:** Game Over.

### ⚔️ Target Types
*   **Normal:** Standard drifting circles.
*   **Tough (Armor):** Requires 3 hits to destroy.
*   **Split:** Splits into two smaller, faster targets when hit.
*   **Stationary:** Does not move, acting as an obstacle.
*   **Sine Wave:** Moves in a tricky wave pattern.
*   **Color Shift:** Periodically changes color. Be careful!
*   **BOSS:** Appears every few levels. High health, summons minions, and changes colors!

---

## ✨ Features

*   **Progression System:** Level up by defeating bosses and unlock new geometric shapes (Square, Triangle, Diamond, Star).
*   **Achievement System:** over 20 unique achievements to unlock with a toast notification system.
*   **Combo Streaks:** Build your streak to earn Score Multipliers (up to 3x).
*   **Visuals:** 60FPS particle systems, screen shake, and neon glow effects.
*   **Audio:** Retro Synthwave soundtrack and dynamic sound effects.
*   **Themes:** Switch between **Light Mode** and **Dark Mode**.
*   **Save System:** Automatically saves your High Score, Stats, and Settings (local storage).
*   **Telegram Integration:** Works natively as a Telegram Mini App with theme syncing and haptic feedback.

---

## 🛠️ Tech Stack

*   **Framework:** React 19
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS
*   **Language:** TypeScript
*   **Icons:** Lucide React
*   **Audio:** Web Audio API (Custom synthesizer, no external assets)

## 🚀 Local Development

1.  Clone the repository:
    ```bash
    git clone https://github.com/OTRaainbow/Chroma-Shot.git
    cd Chroma-Shot
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run development server:
    ```bash
    npm run dev
    ```

4.  Build for production:
    ```bash
    npm run build
    ```
