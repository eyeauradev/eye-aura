import { type Variants } from "framer-motion";

/** Staggered card entrance animation */
export const cardEntrance: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

/** Card hover animation */
export const cardHover: Variants = {
  rest: { y: 0, transition: { duration: 0.2, ease: "easeOut" } },
  hover: { y: -3, transition: { duration: 0.2, ease: "easeOut" } },
};

/** Page content entrance */
export const pageEntrance: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

/** Button press animation */
export const buttonPress = {
  whileTap: { scale: 0.98 },
  whileHover: { y: -1 },
  transition: { duration: 0.2, ease: "easeOut" },
};

/** Fade in for general elements */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

/** Stagger container for child animations */
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

/** Table row staggered entrance animation */
export const tableRowEntrance: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.2, ease: "easeOut" },
  }),
};

/** Modal entrance animation (fade-in + scale-up) */
export const modalEntrance: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.2, ease: "easeOut" },
  },
};

/** Modal exit animation (fade-out + scale-down) */
export const modalExit: Variants = {
  visible: { opacity: 1, scale: 1 },
  hidden: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15, ease: "easeIn" },
  },
};

/** Tab indicator spring animation config */
export const tabIndicator = {
  layoutId: "activeTab",
  transition: {
    type: "spring",
    stiffness: 500,
    damping: 30,
    duration: 0.3,
  },
};

/** Status transition fade animation */
export const statusTransition: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};
