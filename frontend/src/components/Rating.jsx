export default function Rating({ value, max = 5 }) {
  const rating = Math.max(0, Math.min(max, Number(value) || 0));
  return (
    <span className="rating" aria-label={`Rated ${rating} out of ${max}`}>
      {Array.from({ length: max }, (_, index) => (
        <span key={index} className={`pip${index < rating ? ' is-on' : ''}`} aria-hidden="true" />
      ))}
      <span className="rating-num" aria-hidden="true">
        {rating}/{max}
      </span>
    </span>
  );
}
