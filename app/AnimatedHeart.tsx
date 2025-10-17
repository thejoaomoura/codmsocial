import { HiHeart } from "react-icons/hi";
import { motion } from "framer-motion";

export default function AnimatedHeart() {
  return (
    <motion.div
      animate={{ color: ["#ffffff", "#ff0000", "#ffffff"] }} // branco -> vermelho -> branco
      className="w-6 h-6 mr-0"
      transition={{ duration: 1, repeat: Infinity, repeatType: "loop" }}
    >
      <HiHeart className="w-6 h-6" />
    </motion.div>
  );
}
