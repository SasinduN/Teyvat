import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

/**
 * A router `Link` that animates like `motion.div`: the cards that became
 * links keep their entrance animations and their classes. A `flex` or block
 * `<a>` lays out exactly like the `<div>` it replaced, and Tailwind's base
 * styles already give links the surrounding colour and no underline.
 */
export const MotionLink = motion.create(Link);
