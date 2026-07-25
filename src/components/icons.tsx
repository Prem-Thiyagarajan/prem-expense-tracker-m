import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

type IconProps = {
  size?: number;
  color?: string;
  strokeWidth?: number;
};

const base = (size: number) => ({ width: size, height: size, viewBox: '0 0 24 24' });

/** House with door. */
export function HomeIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Path
        d="M3 10.5 12 3l9 7.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5 9.5V20h14V9.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M10 20v-5h4v5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Three bar-chart columns. */
export function TrendsIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Line x1={6} y1={20} x2={6} y2={13} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={12} y1={20} x2={12} y2={5} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={18} y1={20} x2={18} y2={9} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Receipt with a zigzag bottom edge. */
export function ReceiptIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Path
        d="M5 3h14v18l-2.3-1.4L14.4 21 12 19.6 9.6 21 7.3 19.6 5 21V3Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Line x1={8.5} y1={8} x2={15.5} y2={8} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={8.5} y1={12} x2={15.5} y2={12} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Target with a center dot. */
export function TargetIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={12} cy={12} r={5} stroke={color} strokeWidth={strokeWidth} />
      <Circle cx={12} cy={12} r={1.6} fill={color} />
    </Svg>
  );
}

/** Plus (for the center FAB). */
export function PlusIcon({ size = 24, color = '#fff', strokeWidth = 2.5 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Line x1={12} y1={5} x2={12} y2={19} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={5} y1={12} x2={19} y2={12} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Chevrons for month controls / navigation. */
export function ChevronLeftIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Polyline
        points="15 5 8 12 15 19"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ChevronRightIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Polyline
        points="9 5 16 12 9 19"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Calendar with a top binding — used by date pickers. */
export function CalendarIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Rect x={3} y={5} width={18} height={16} rx={2.5} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={3} y1={9.5} x2={21} y2={9.5} stroke={color} strokeWidth={strokeWidth} />
      <Line x1={8} y1={3} x2={8} y2={6.5} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={16} y1={3} x2={16} y2={6.5} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Trash can — destructive row actions. */
export function TrashIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Line x1={4} y1={6} x2={20} y2={6} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Path
        d="M6 6l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M9.5 6V4.5a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1V6" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
      <Line x1={10} y1={10} x2={10} y2={17} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      <Line x1={14} y1={10} x2={14} y2={17} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

/** Pencil — edit affordance. */
export function PencilIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Path
        d="M4 16.5 15 5.5a2 2 0 0 1 3 3L7 19.5l-4 1 1-4Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Right-pointing chevron used as a "drill-in" cue on list rows. */
export function ChevronRowIcon({ size = 24, color = '#000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg {...base(size)} fill="none">
      <Polyline
        points="9 6 15 12 9 18"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
