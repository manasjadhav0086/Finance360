/**
 * Resolves effective allowed segments and businesses for a given user.
 * If user is admin, returns isUnrestricted: true.
 * If user is a standard user, resolves strict allowed segments and businesses based on their configuration.
 * Canonical mapping:
 * - Business Group = Segment / segment
 * - Business = Biz1 / biz1
 */
export function resolveUserScope(user, businessMappingRecords = []) {
  if (!user || user.role === 'admin') {
    return {
      isUnrestricted: true,
      allowedSegments: null,
      allowedBizs: null,
      allowedSegmentLabels: null,
      allowedBizLabels: null,
    };
  }

  const rawGroups = Array.isArray(user.business_groups) ? user.business_groups.filter(Boolean) : [];
  const rawBizs = Array.isArray(user.businesses) ? user.businesses.filter(Boolean) : [];

  const hasGroups = rawGroups.length > 0;
  const hasBizs = rawBizs.length > 0;

  // Zero assigned scopes means no access to financial data
  if (!hasGroups && !hasBizs) {
    return {
      isUnrestricted: false,
      allowedSegments: [],
      allowedBizs: [],
      allowedSegmentLabels: [],
      allowedBizLabels: [],
    };
  }

  const allowedSegments = new Set();
  const allowedBizs = new Set();
  const allowedSegmentLabels = new Set();
  const allowedBizLabels = new Set();

  const isGroupMatch = (targetGroup, sOld, sNew) => {
    const gClean = targetGroup.toLowerCase().trim();
    const gNorm = gClean.replace(/^\d+[\s._-]+/, '');
    const sOldClean = sOld.toLowerCase().trim();
    const sNewClean = sNew.toLowerCase().trim();
    const sOldNorm = sOldClean.replace(/^\d+[\s._-]+/, '');
    const sNewNorm = sNewClean.replace(/^\d+[\s._-]+/, '');
    return (
      gClean === sOldClean ||
      gClean === sNewClean ||
      gNorm === sOldNorm ||
      gNorm === sNewNorm
    );
  };

  const isBizMatch = (targetBiz, bOld, bNew) => {
    const bClean = targetBiz.toLowerCase().trim();
    return (
      (bOld && bOld.toLowerCase().trim() === bClean) ||
      (bNew && bNew.toLowerCase().trim() === bClean)
    );
  };

  const bmList = Array.isArray(businessMappingRecords) ? businessMappingRecords : [];

  if (hasGroups && hasBizs) {
    // Both group-level and business-level scopes apply: enforce their intended intersection.
    // A business is only permitted if it belongs to one of the authorized groups AND is in user's businesses.
    for (const bmr of bmList) {
      const sOld = String(bmr.segment || bmr.Segment || '').trim();
      const sNew = String(bmr.segment_n || bmr.Segment_N || '').trim();
      const bOld = String(bmr.biz1 || bmr.Biz1 || '').trim();
      const bNew = String(bmr.biz1_n || bmr.Biz1_N || '').trim();

      const groupMatches = rawGroups.some((g) => isGroupMatch(g, sOld, sNew));
      const bizMatches = rawBizs.some((b) => isBizMatch(b, bOld, bNew));

      if (groupMatches && bizMatches) {
        if (bOld) allowedBizs.add(bOld);
        if (bNew) allowedBizs.add(bNew);
        if (sOld) allowedSegments.add(sOld);
        if (sNew) allowedSegments.add(sNew);
        if (sNew) allowedSegmentLabels.add(sNew);
        else if (sOld) allowedSegmentLabels.add(sOld);
        if (bNew) allowedBizLabels.add(bNew);
        else if (bOld) allowedBizLabels.add(bOld);
      }
    }

    // Always ensure the explicitly assigned groups are present in allowedSegments
    // so that the user's authorized groups are fully represented in dropdown options
    rawGroups.forEach((g) => {
      allowedSegments.add(g);
      allowedSegmentLabels.add(g);
    });

  } else if (hasGroups && !hasBizs) {
    // Inherit all businesses that belong to authorized Business Groups
    for (const bmr of bmList) {
      const sOld = String(bmr.segment || bmr.Segment || '').trim();
      const sNew = String(bmr.segment_n || bmr.Segment_N || '').trim();
      const bOld = String(bmr.biz1 || bmr.Biz1 || '').trim();
      const bNew = String(bmr.biz1_n || bmr.Biz1_N || '').trim();

      const groupMatches = rawGroups.some((g) => isGroupMatch(g, sOld, sNew));

      if (groupMatches) {
        if (bOld) allowedBizs.add(bOld);
        if (bNew) allowedBizs.add(bNew);
        if (sOld) allowedSegments.add(sOld);
        if (sNew) allowedSegments.add(sNew);
        if (sNew) allowedSegmentLabels.add(sNew);
        else if (sOld) allowedSegmentLabels.add(sOld);
        if (bNew) allowedBizLabels.add(bNew);
        else if (bOld) allowedBizLabels.add(bOld);
      }
    }

    rawGroups.forEach((g) => {
      allowedSegments.add(g);
      allowedSegmentLabels.add(g);
    });

  } else if (!hasGroups && hasBizs) {
    // Businesses assigned independently without group restrictions
    for (const bmr of bmList) {
      const sOld = String(bmr.segment || bmr.Segment || '').trim();
      const sNew = String(bmr.segment_n || bmr.Segment_N || '').trim();
      const bOld = String(bmr.biz1 || bmr.Biz1 || '').trim();
      const bNew = String(bmr.biz1_n || bmr.Biz1_N || '').trim();

      const bizMatches = rawBizs.some((b) => isBizMatch(b, bOld, bNew));

      if (bizMatches) {
        if (bOld) allowedBizs.add(bOld);
        if (bNew) allowedBizs.add(bNew);
        if (sOld) allowedSegments.add(sOld);
        if (sNew) allowedSegments.add(sNew);
        if (sNew) allowedSegmentLabels.add(sNew);
        else if (sOld) allowedSegmentLabels.add(sOld);
        if (bNew) allowedBizLabels.add(bNew);
        else if (bOld) allowedBizLabels.add(bOld);
      }
    }

    rawBizs.forEach((b) => {
      allowedBizs.add(b);
      allowedBizLabels.add(b);
    });
  }

  return {
    isUnrestricted: false,
    allowedSegments: Array.from(allowedSegments),
    allowedBizs: Array.from(allowedBizs),
    allowedSegmentLabels: Array.from(allowedSegmentLabels),
    allowedBizLabels: Array.from(allowedBizLabels),
  };
}
