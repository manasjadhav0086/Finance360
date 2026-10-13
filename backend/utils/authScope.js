/**
 * Resolves effective allowed segments and businesses for a given user.
 * If user is admin, returns isUnrestricted: true.
 * If user is a standard user, resolves strict allowed segments and businesses based on their configuration.
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

  if (rawGroups.length === 0 && rawBizs.length === 0) {
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

  for (const bmr of businessMappingRecords || []) {
    const sOld = String(bmr.segment || bmr.Segment || '').trim();
    const sNew = String(bmr.segment_n || bmr.Segment_N || '').trim();
    const bOld = String(bmr.biz1 || bmr.Biz1 || '').trim();
    const bNew = String(bmr.biz1_n || bmr.Biz1_N || '').trim();

    const groupMatches = rawGroups.some((g) => {
      const gClean = g.toLowerCase().trim();
      const gNorm = gClean.replace(/^\d+[\s._-]+/, '');
      const sOldNorm = sOld.toLowerCase().replace(/^\d+[\s._-]+/, '');
      const sNewNorm = sNew.toLowerCase().replace(/^\d+[\s._-]+/, '');
      return (
        sOld.toLowerCase() === gClean ||
        sNew.toLowerCase() === gClean ||
        sOldNorm === gNorm ||
        sNewNorm === gNorm
      );
    });

    const bizMatches = rawBizs.some((b) => {
      const bClean = b.toLowerCase().trim();
      return (
        (bOld && bOld.toLowerCase() === bClean) ||
        (bNew && bNew.toLowerCase() === bClean)
      );
    });

    if (rawBizs.length > 0) {
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
    } else if (groupMatches) {
      if (sOld) allowedSegments.add(sOld);
      if (sNew) allowedSegments.add(sNew);
      if (bOld) allowedBizs.add(bOld);
      if (bNew) allowedBizs.add(bNew);
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
  if (rawBizs.length === 0) {
    rawGroups.forEach((g) => {
      allowedSegments.add(g);
      allowedSegmentLabels.add(g);
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
