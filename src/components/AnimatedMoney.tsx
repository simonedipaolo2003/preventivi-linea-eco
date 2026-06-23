import { AnimatePresence, motion } from 'framer-motion';
import { formatEur, formatEur0 } from '@/lib/money';

/** Valore monetario con cross-fade morbido al cambio — niente bounce. */
export function AnimatedMoney({
  value,
  decimals = true,
  className,
}: {
  value: number;
  decimals?: boolean;
  className?: string;
}) {
  const text = decimals ? formatEur(value) : formatEur0(value);
  return (
    <span className={`tnum relative inline-block ${className ?? ''}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={text}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4, position: 'absolute' }}
          transition={{ duration: 0.28, ease: [0.22, 0.61, 0.36, 1] }}
          className="inline-block"
        >
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
