def pert_estimate(optimistic: float, most_likely: float, pessimistic: float) -> dict:
    expected = (optimistic + 4 * most_likely + pessimistic) / 6
    std_dev = (pessimistic - optimistic) / 6
    return {
        "expected_hours": round(expected, 2),
        "std_dev": round(std_dev, 2),
        "low_95": round(expected - 2 * std_dev, 2),
        "high_95": round(expected + 2 * std_dev, 2),
    }
