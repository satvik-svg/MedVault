INDIA_PREVALENCE_RATIOS: dict[str, float] = {
    "Tuberculosis": 4.0,
    "Dengue fever": 8.0,
    "Typhoid fever": 6.0,
    "Malaria": 3.5,
    "Hepatitis A": 2.5,
    "Hepatitis B": 2.0,
    "Acute gastroenteritis": 2.0,
    "Pneumonia": 1.5,
    "Lyme disease": 0.1,
    "Allergic rhinitis": 0.7,
    "Influenza": 0.8,
}


def reweight_probabilities(raw_probs: dict[str, float]) -> dict[str, float]:
    weighted = {
        disease: probability * INDIA_PREVALENCE_RATIOS.get(disease, 1.0)
        for disease, probability in raw_probs.items()
    }
    total = sum(weighted.values()) or 1.0
    return {disease: probability / total for disease, probability in weighted.items()}
