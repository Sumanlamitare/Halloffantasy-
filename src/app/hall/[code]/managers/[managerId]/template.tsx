"use client";

import { motion } from "motion/react";

/** Remounts on navigation between Hall sections: spring fade-up with a soft de-blur. */
export default function HallTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ type: "spring", stiffness: 170, damping: 24 }}
    >
      {children}
    </motion.div>
  );
}
