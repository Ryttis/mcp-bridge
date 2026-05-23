function formatCar(car) {
    const details = [`${car.year} ${car.make} ${car.model}`];
    if (car.engine) details.push(car.engine);
    if (car.vin) details.push(`VIN: ${car.vin}`);
    return details.join(", ");
}

const PART_TRANSLATIONS = new Map([
    ["front left headlight", "priekinį kairės pusės žibintą"],
    ["front right headlight", "priekinį dešinės pusės žibintą"],
    ["front bumper", "priekinį bamperį"],
    ["rear bumper", "galinį bamperį"],
    ["hood", "variklio dangtį"],
    ["left mirror", "kairės pusės veidrodėlį"],
    ["right mirror", "dešinės pusės veidrodėlį"]
]);

function translatePartName(partName) {
    const normalized = partName.trim().toLowerCase();
    return PART_TRANSLATIONS.get(normalized) ?? partName.trim();
}

function buildPerPartQuestions(part) {
    const spokenPartName = translatePartName(part.name);
    const availabilityQuestion = part.notes
        ? `Ar turite šią detalę: ${spokenPartName}? Pastabos: ${part.notes}.`
        : `Ar turite šią detalę: ${spokenPartName}?`;

    return {
        partName: part.name,
        spokenPartName,
        questions: [
            availabilityQuestion,
            "Kokia būtų kaina?",
            "Kokia detalės būklė: ar yra įbrėžimų, lūžimų, ar viskas tvarkinga?"
        ]
    };
}

function buildCityPickupQuestion(cityPreference) {
    const city = String(cityPreference).trim();
    if (city.toLowerCase() === "vilnius") {
        return "Ar detalę galima atsiimti Vilniuje arba netoli Vilniaus?";
    }

    return `Ar detalę galima atsiimti mieste ${city} arba netoli jo?`;
}

export function buildLithuanianScript(campaign) {
    const carDetails = formatCar(campaign.car);
    const constraints = campaign.constraints ?? {};
    const perPartQuestions = campaign.parts.map((part) => buildPerPartQuestions(part));
    const generalQuestions = [
        "Jeigu turite bent vieną iš šių dalių, koks būtų atsiėmimo adresas?"
    ];

    if (constraints.cityPreference) {
        generalQuestions.push(buildCityPickupQuestion(constraints.cityPreference));
    }

    if (constraints.maxPrice !== null && constraints.maxPrice !== undefined) {
        generalQuestions.push(`Ar kaina neviršytų ${constraints.maxPrice}?`);
    }

    if (constraints.pickupOnly === true) {
        generalQuestions.push("Ar galimas atsiėmimas vietoje be siuntimo?");
    }

    generalQuestions.push(
        "Kokios jūsų darbo valandos šiandien ir artimiausiomis dienomis?",
        "Ar galima detalę rezervuoti, kol atvyksiu apžiūrėti?"
    );

    const questions = [
        ...perPartQuestions.flatMap((part) => part.questions),
        ...generalQuestions
    ];

    return {
        intro: `Laba diena, mano vardas ${campaign.callerName}. Skambinu dėl naudotų automobilio dalių. Ieškau dalių automobiliui: ${carDetails}.`,
        perPartQuestions,
        generalQuestions,
        questions,
        closing: "Ačiū už informaciją. Gražios dienos."
    };
}
