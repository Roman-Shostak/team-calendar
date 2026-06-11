// Стабільний колір для кожного імені (однаковий між сесіями та пристроями).
export function colorFor(name) {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const hue = Math.abs(h) % 360;
  return {
    bg: `hsl(${hue} 65% 94%)`,
    border: `hsl(${hue} 55% 64%)`,
    text: `hsl(${hue} 45% 28%)`,
    bar: `hsl(${hue} 58% 55%)`,
  };
}
