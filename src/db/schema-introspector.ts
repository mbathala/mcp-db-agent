export async function introspectSchema(pool: any, type: string): Promise<any> {
  try {
    if (type === 'postgres') {
      const result = await pool.query(`
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public'
        ORDER BY table_name, ordinal_position;
      `);
      return result.rows;
    } 
    else if (type === 'mysql') {
      const [rows] = await pool.execute(`
        SELECT TABLE_NAME as table_name, COLUMN_NAME as column_name, DATA_TYPE as data_type 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE()
        ORDER BY TABLE_NAME, ORDINAL_POSITION;
      `);
      return rows;
    } else if (type === 'mongodb') {
      const collections = await pool.collections();
      return collections.map((collection: any) => ({ collection_name: collection.collectionName }));
    }
    return [];
  } catch (error) {
    console.error('Schema introspection failed:', error);
    return [];
  }
}