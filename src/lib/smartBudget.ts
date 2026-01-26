
export const getSmartSuggestion = (
    catName: string,
    totalProjectedIncome: number
): { amount: number; reason: string } | null => {
    if (!totalProjectedIncome || totalProjectedIncome === 0) return null;

    const n = catName.toLowerCase();
    const formattedTotal = totalProjectedIncome.toLocaleString();
    const reasonSuffix = `of $${formattedTotal} Income`;

    // Housing (30%)
    if (n.match(/housing|rent|mortgage|casa|hogar|alquiler|hipoteca/)) {
        return { amount: totalProjectedIncome * 0.30, reason: `30% ${reasonSuffix}` };
    }

    // Food & Dining (15%)
    if (n.match(/food|dining|grocery|groceries|comida|supermercado/)) {
        return { amount: totalProjectedIncome * 0.15, reason: `15% ${reasonSuffix}` };
    }

    // Transportation (15%)
    if (n.match(/transport|car|gas|fuel|uber|auto|transporte|gasolina/)) {
        return { amount: totalProjectedIncome * 0.15, reason: `15% ${reasonSuffix}` };
    }

    // Utilities (10%)
    if (n.match(/util|electric|water|bill|luz|agua|servicios/)) {
        return { amount: totalProjectedIncome * 0.10, reason: `10% ${reasonSuffix}` };
    }

    // Savings & Investment (20%)
    if (n.match(/save|saving|invest|ahorro|inversion/)) {
        return { amount: totalProjectedIncome * 0.20, reason: `20% ${reasonSuffix}` };
    }

    // Debt (15%)
    if (n.match(/debt|loan|credit|deuda|prestamo|credito/)) {
        return { amount: totalProjectedIncome * 0.15, reason: `15% ${reasonSuffix}` };
    }

    // Entertainment & Leisure (5%) - Expanded
    if (n.match(/entertainment|fun|ocio|gaming|game|juegos|hobby|hobbies|subscription|netflix|spotify/)) {
        return { amount: totalProjectedIncome * 0.05, reason: `5% ${reasonSuffix}` };
    }

    // Shopping (5%)
    if (n.match(/shopping|cloth|ropa|compras/)) {
        return { amount: totalProjectedIncome * 0.05, reason: `5% ${reasonSuffix}` };
    }

    return null;
};
