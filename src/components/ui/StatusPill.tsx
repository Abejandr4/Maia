import type { Status } from '../../utils/types';
import { STATUS_LABEL } from '../../utils/baselines';
import Icon, { type IconName } from './Icon';
import './ui.css';

const ICON: Record<Status, IconName> = {
  normal: 'check',
  advisory: 'info',
  caution: 'alert',
  warning: 'alert',
  critical: 'alert',
};

interface StatusPillProps {
  status: Status;
  label?: string;
  size?: 'sm' | 'md';
}

export default function StatusPill({ status, label, size = 'md' }: StatusPillProps) {
  return (
    <span className={`pill pill--${status} pill--${size}`}>
      <Icon name={ICON[status]} size={size === 'sm' ? 11 : 13} strokeWidth={2.5} />
      {label ?? STATUS_LABEL[status]}
    </span>
  );
}
