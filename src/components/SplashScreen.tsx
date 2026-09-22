import { useEffect, useState } from "react";

import frame01 from "../assets/splash/frame01.jpg";
import frame02 from "../assets/splash/frame02.jpg";
import frame03 from "../assets/splash/frame03.jpg";
import frame04 from "../assets/splash/frame04.jpg";
import frame05 from "../assets/splash/frame05.jpg";
import frame06 from "../assets/splash/frame06.jpg";
import frame07 from "../assets/splash/frame07.jpg";
import frame08 from "../assets/splash/frame08.jpg";
import frame09 from "../assets/splash/frame09.jpg";
import frame10 from "../assets/splash/frame10.jpg";
import frame11 from "../assets/splash/frame11.jpg";
import frame12 from "../assets/splash/frame12.jpg";

const frames = [
  frame01,
  frame02,
  frame03,
  frame04,
  frame05,
  frame06,
  frame07,
  frame08,
  frame09,
  frame10,
  frame11,
  frame12,
  frame01,
  frame02,
  frame03,
  frame04,
  frame05,
  frame06,
  frame07,
  frame08,
  frame09,
  frame10,
  frame11,
  frame12,
];

interface SplashScreenProps {
  onFinished: () => void;
}

export default function SplashScreen({
  onFinished,
}: SplashScreenProps) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((current) => {
        if (current === frames.length - 1) {
          clearInterval(interval);
          return current;
        }

        return current + 1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (frame === frames.length - 1) {
      const timeout = setTimeout(() => {
        onFinished();
      }, 200);

      return () => clearTimeout(timeout);
    }
  }, [frame, onFinished]);

  return (
    <div className="splash-screen">
      <img
        src={frames[frame]}
        alt=""
        className="splash-frame"
      />
    </div>
  );
}