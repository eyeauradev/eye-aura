import type { ServiceDocument } from "@/types/firestore";

/**
 * Computes the set of doctorIds that can provide ALL given services.
 * Returns the intersection of doctorIds across all services.
 *
 * - Empty services array → empty array
 * - Single service → its doctorIds
 * - Multiple services → intersection of all doctorIds arrays
 */
export function computeDoctorIntersection(
  services: ServiceDocument[]
): string[] {
  if (services.length === 0) return [];
  if (services.length === 1) return [...services[0].doctorIds];

  const [first, ...rest] = services;
  let intersection = new Set(first.doctorIds);

  for (const service of rest) {
    const current = new Set(service.doctorIds);
    intersection = new Set(
      [...intersection].filter((id) => current.has(id))
    );
  }

  return [...intersection];
}

/**
 * Given the current selection and all available services,
 * returns a map of serviceId → { compatible: boolean }.
 *
 * A service is compatible if adding it to the current selection
 * keeps the doctor intersection non-empty.
 *
 * - If selectedServices is empty, all services are compatible.
 * - Only unselected services appear in the result map.
 */
export function computeServiceCompatibility(
  selectedServices: ServiceDocument[],
  allServices: ServiceDocument[]
): Map<string, { compatible: boolean }> {
  const result = new Map<string, { compatible: boolean }>();

  const selectedIds = new Set(selectedServices.map((s) => s.id));

  // If nothing is selected, all services are compatible
  if (selectedServices.length === 0) {
    for (const service of allServices) {
      if (!selectedIds.has(service.id)) {
        result.set(service.id, { compatible: true });
      }
    }
    return result;
  }

  const currentIntersection = computeDoctorIntersection(selectedServices);
  const currentSet = new Set(currentIntersection);

  for (const service of allServices) {
    if (selectedIds.has(service.id)) continue;

    // A candidate is compatible if the intersection of its doctorIds
    // with the current doctor intersection is non-empty
    const hasCommonDoctor = service.doctorIds.some((id) =>
      currentSet.has(id)
    );

    result.set(service.id, { compatible: hasCommonDoctor });
  }

  return result;
}

/**
 * Calculates total price, total duration, and currency for selected services.
 *
 * - totalPrice = sum of all service prices
 * - totalDuration = sum of all service durations
 * - currency = first service's currency (fallback to "INR" if array is empty)
 */
export function computeBookingSummary(services: ServiceDocument[]): {
  totalPrice: number;
  totalDuration: number;
  currency: string;
} {
  if (services.length === 0) {
    return { totalPrice: 0, totalDuration: 0, currency: "INR" };
  }

  const totalPrice = services.reduce((sum, s) => sum + s.price, 0);
  const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);
  const currency = services[0].currency;

  return { totalPrice, totalDuration, currency };
}

/**
 * Returns the effective list of service IDs for a document.
 *
 * - If doc.serviceIds exists and is a non-empty array, returns it.
 * - Otherwise returns [doc.serviceId].
 */
export function getEffectiveServiceIds(doc: {
  serviceId: string;
  serviceIds?: string[];
}): string[] {
  if (doc.serviceIds && doc.serviceIds.length > 0) {
    return doc.serviceIds;
  }
  return [doc.serviceId];
}
