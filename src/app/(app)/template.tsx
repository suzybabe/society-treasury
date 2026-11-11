"use client";

import { motion } from "motion/react";
import { EASE } from "@/components/motion";

// A template remounts on every navigation, which gives each page an entrance animation.
export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
      {children}
    </motion.div>
  );
}
