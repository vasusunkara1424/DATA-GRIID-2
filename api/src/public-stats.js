app.get('/api/stats/public', async (req, res) => {
  try {
    const connectors = await pool.query('SELECT COUNT(*) as count FROM connectors WHERE workspace_id = 1');
    const pipelines = await pool.query('SELECT COUNT(*) as count FROM pipelines WHERE workspace_id = 1');
    const alerts = await pool.query('SELECT COUNT(*) as count FROM alerts WHERE workspace_id = 1');
    res.json({
      pipelines: parseInt(pipelines.rows[0].count) || 0,
      sources: parseInt(connectors.rows[0].count) || 0,
      activeAlerts: parseInt(alerts.rows[0].count) || 0,
      aiQueries: 0
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
