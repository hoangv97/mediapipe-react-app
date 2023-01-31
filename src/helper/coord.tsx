export function angleBetween3Points(
  A: { x: number; y: number } | null,
  B: { x: number; y: number } | null,
  C: { x: number; y: number } | null
) {
  if (!A || !B || !C) return null;
  const AB = Math.sqrt(Math.pow(B.x - A.x, 2) + Math.pow(B.y - A.y, 2));
  const BC = Math.sqrt(Math.pow(B.x - C.x, 2) + Math.pow(B.y - C.y, 2));
  const AC = Math.sqrt(Math.pow(C.x - A.x, 2) + Math.pow(C.y - A.y, 2));
  const radians = Math.acos((BC * BC + AB * AB - AC * AC) / (2 * AB * BC));
  let angle = radians * (180 / Math.PI);
  if (angle > 180) {
    angle = 360 - angle;
  }
  // console.log(A, B, C, radians, angle);
  return angle;
}
