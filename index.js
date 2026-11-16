
// ===== Счётчик «в избранном» на скидке (продавец не читает чужие избранные) =====
exports.countFavorites = onDocumentWritten('users/{uid}/favorites/{dealId}', async (event) => {
  const before = event.data.before.exists;
  const after = event.data.after.exists;
  if (before === after) return;
  await db.collection('deals').doc(event.params.dealId)
    .update({ favCount: admin.firestore.FieldValue.increment(after ? 1 : -1) })
    .catch(() => {});
});

// ===== Счётчик «в избранном» на скидке (продавец не читает чужие избранные) =====
exports.countFavorites = onDocumentWritten('users/{uid}/favorites/{dealId}', async (event) => {
  const before = event.data.before.exists;
  const after = event.data.after.exists;
  if (before === after) return;
  await db.collection('deals').doc(event.params.dealId)
    .update({ favCount: admin.firestore.FieldValue.increment(after ? 1 : -1) })
    .catch(() => {});
});
