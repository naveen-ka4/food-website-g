import React from "react";

export function DoodleHeartOutline({
  className = "size-5",
  color = "#A15442",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M16 27C14.2 25.2 5 18 4.2 11.8C3.5 6.5 7.5 3.5 12 4.2C14.5 4.6 15.5 6.2 16 7C16.5 6.2 17.8 4.6 20.2 4.2C24.8 3.5 28.5 6.5 27.8 11.8C27 18 17.8 25.2 16 27Z"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DoodleHeartOutlineAlt({
  className = "size-5",
  color = "#A15442",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M16 26C13.8 24 4.5 17.5 4 11.5C3.5 6.8 7 3.8 11.2 4.2C13.8 4.5 15.2 6.2 16 7C16.8 6.2 18.2 4.5 20.8 4.2C25 3.8 28.5 6.8 28 11.5C27.5 17.5 18.2 24 16 26Z"
        stroke={color}
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DoodleHeartFilled({
  className = "size-4.5",
  fillColor = "#8FA887",
  strokeColor = "#3E342B",
}: {
  className?: string;
  fillColor?: string;
  strokeColor?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M16 26.5C14.2 24.8 5.2 17.8 4.4 12C3.8 7 7.4 4 11.8 4.5C14.2 4.8 15.4 6.5 16 7.2C16.6 6.5 17.8 4.8 20.2 4.5C24.6 4 28.2 7 27.6 12C26.8 17.8 17.8 24.8 16 26.5Z"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Pasta Bowl Illustration with floating hand-drawn doodle hearts for Login
 * Fully locked: no animation, not draggable, completely static
 */
export function LoginIllustrationContainer() {
  return (
    <div className="relative size-64 sm:size-76 lg:size-84 flex items-center justify-center select-none pointer-events-none">
      {/* The main transparent webp illustration (locked, cannot be dragged) */}
      <img
        src="/login-illustration.webp"
        alt="Delicious pasta and garlic illustration"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        className="w-full h-full object-contain filter drop-shadow-sm relative z-10 select-none pointer-events-none"
        style={{ userSelect: "none", WebkitUserDrag: "none" } as React.CSSProperties}
      />

      {/* Floating Doodle Hearts surrounding the illustration (locked) */}
      {/* 1. Top Left Cluster (Terracotta outline + Sage filled) */}
      <div className="absolute top-2 left-6 z-20 pointer-events-none select-none">
        <DoodleHeartOutline className="size-6 -rotate-12" color="#A15442" />
      </div>
      <div className="absolute top-10 left-13 z-20 pointer-events-none select-none">
        <DoodleHeartFilled className="size-4.5 rotate-15" fillColor="#8FA887" />
      </div>
      <div className="absolute top-18 left-2 z-20 pointer-events-none opacity-85 select-none">
        <DoodleHeartOutlineAlt className="size-4 -rotate-8" color="#A15442" />
      </div>

      {/* 2. Top Center Accent */}
      <div className="absolute -top-1 left-1/2 -translate-x-6 z-20 pointer-events-none select-none">
        <DoodleHeartOutline className="size-5 -rotate-6" color="#A15442" />
      </div>

      {/* 3. Top Right Cluster near Garlic */}
      <div className="absolute top-3 right-8 z-20 pointer-events-none select-none">
        <DoodleHeartOutline className="size-6 rotate-15" color="#A15442" />
      </div>
      <div className="absolute top-12 right-14 z-20 pointer-events-none select-none">
        <DoodleHeartFilled className="size-4 -rotate-10" fillColor="#8FA887" />
      </div>
      <div className="absolute top-22 right-3 z-20 pointer-events-none opacity-85 select-none">
        <DoodleHeartOutlineAlt className="size-4.5 rotate-12" color="#A15442" />
      </div>

      {/* 4. Bottom Left Cluster near Basil Leaves */}
      <div className="absolute bottom-6 left-4 z-20 pointer-events-none select-none">
        <DoodleHeartOutline className="size-5 -rotate-15" color="#A15442" />
      </div>
      <div className="absolute bottom-1 right-20 z-20 pointer-events-none select-none">
        <DoodleHeartFilled className="size-3.5 rotate-8" fillColor="#8FA887" />
      </div>

      {/* 5. Bottom Right Cluster near Garlic Cloves */}
      <div className="absolute bottom-6 right-5 z-20 pointer-events-none select-none">
        <DoodleHeartOutline className="size-5 rotate-12" color="#A15442" />
      </div>
    </div>
  );
}

/**
 * Cutting Board Illustration with floating hand-drawn doodle hearts for Register
 * Fully locked: no animation, not draggable, completely static
 */
export function RegisterIllustrationContainer() {
  return (
    <div className="relative size-64 sm:size-76 lg:size-84 flex items-center justify-center select-none pointer-events-none">
      {/* The main transparent webp illustration (locked, cannot be dragged) */}
      <img
        src="/register-illustration.webp"
        alt="Garlic and herbs cutting board illustration"
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        className="w-full h-full object-contain filter drop-shadow-sm relative z-10 select-none pointer-events-none"
        style={{ userSelect: "none", WebkitUserDrag: "none" } as React.CSSProperties}
      />

      {/* Floating Doodle Hearts surrounding the illustration (locked) */}
      {/* 1. Top Left near Board Handle */}
      <div className="absolute top-3 left-8 z-20 pointer-events-none select-none">
        <DoodleHeartOutline className="size-5.5 -rotate-12" color="#A15442" />
      </div>
      <div className="absolute top-14 left-4 z-20 pointer-events-none select-none">
        <DoodleHeartFilled className="size-4 rotate-12" fillColor="#8FA887" />
      </div>

      {/* 2. Top Center above Garlic Bulb */}
      <div className="absolute -top-1 left-1/2 -translate-x-3 z-20 pointer-events-none select-none">
        <DoodleHeartOutline className="size-6 -rotate-6" color="#A15442" />
      </div>
      <div className="absolute top-6 left-1/2 translate-x-5 z-20 pointer-events-none select-none">
        <DoodleHeartFilled className="size-4.5 rotate-18" fillColor="#8FA887" />
      </div>

      {/* 3. Top Right near Rosemary & Peppercorns */}
      <div className="absolute top-5 right-7 z-20 pointer-events-none select-none">
        <DoodleHeartOutline className="size-6 rotate-15" color="#A15442" />
      </div>
      <div className="absolute top-14 right-14 z-20 pointer-events-none select-none">
        <DoodleHeartFilled className="size-4 -rotate-12" fillColor="#8FA887" />
      </div>
      <div className="absolute top-24 right-4 z-20 pointer-events-none opacity-90 select-none">
        <DoodleHeartOutlineAlt className="size-4.5 rotate-10" color="#A15442" />
      </div>

      {/* 4. Bottom Left near Cloves */}
      <div className="absolute bottom-8 left-3 z-20 pointer-events-none select-none">
        <DoodleHeartOutline className="size-5.5 -rotate-15" color="#A15442" />
      </div>
      <div className="absolute bottom-2 left-16 z-20 pointer-events-none select-none">
        <DoodleHeartFilled className="size-4 rotate-10" fillColor="#8FA887" />
      </div>

      {/* 5. Bottom Right near Board Edge */}
      <div className="absolute bottom-8 right-6 z-20 pointer-events-none select-none">
        <DoodleHeartOutline className="size-5 rotate-14" color="#A15442" />
      </div>
      <div className="absolute bottom-1 right-18 z-20 pointer-events-none opacity-85 select-none">
        <DoodleHeartOutlineAlt className="size-4 -rotate-8" color="#A15442" />
      </div>
    </div>
  );
}
