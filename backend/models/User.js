import crypto from 'crypto';
import mysqlService from '../utils/mysqlClient.js';

class UserDocument {
  constructor(data = {}) {
    this._id = data._id || data.id || `usr_${crypto.randomBytes(8).toString('hex')}`;
    this.user_id = data.user_id || null;
    this.email = (data.email || '').toLowerCase().trim();
    this.name = data.name || '';
    this.role = data.role === 'admin' ? 'admin' : 'user';

    this.business_groups = Array.isArray(data.business_groups)
      ? data.business_groups
      : (typeof data.business_groups === 'string'
          ? (() => { try { return JSON.parse(data.business_groups); } catch { return []; } })()
          : []);

    this.businesses = Array.isArray(data.businesses)
      ? data.businesses
      : (typeof data.businesses === 'string'
          ? (() => { try { return JSON.parse(data.businesses); } catch { return []; } })()
          : []);

    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
  }

  toObject() {
    return {
      _id: this._id,
      user_id: this.user_id,
      email: this.email,
      name: this.name,
      role: this.role,
      business_groups: this.business_groups,
      businesses: this.businesses,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toJSON() {
    return this.toObject();
  }

  async save() {
    this.updatedAt = new Date();
    await mysqlService.executeQuery(
      `INSERT INTO users (_id, user_id, email, name, role, business_groups, businesses, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         user_id = VALUES(user_id),
         email = VALUES(email),
         name = VALUES(name),
         role = VALUES(role),
         business_groups = VALUES(business_groups),
         businesses = VALUES(businesses),
         updatedAt = VALUES(updatedAt)`,
      [
        this._id,
        this.user_id,
        this.email,
        this.name,
        this.role,
        JSON.stringify(this.business_groups || []),
        JSON.stringify(this.businesses || []),
        this.createdAt,
        this.updatedAt,
      ]
    );
    return this;
  }
}

class UserQueryChain {
  constructor(executor) {
    this.executor = executor;
    this._sort = null;
  }

  sort(sortObj) {
    this._sort = sortObj;
    return this;
  }

  async then(resolve, reject) {
    try {
      const result = await this.executor(this._sort);
      resolve(result);
    } catch (err) {
      reject(err);
    }
  }
}

export const User = {
  /**
   * Find single user by condition { user_id, email, etc. }
   */
  async findOne(filter = {}) {
    let sql = 'SELECT * FROM users WHERE ';
    const conditions = [];
    const params = [];

    if (filter._id) {
      if (filter._id.$ne) {
        conditions.push('_id != ?');
        params.push(String(filter._id.$ne));
      } else {
        conditions.push('_id = ?');
        params.push(String(filter._id));
      }
    }

    if (filter.user_id) {
      conditions.push('user_id = ?');
      params.push(String(filter.user_id));
    }

    if (filter.email) {
      // In case regex was passed, extract the raw string if possible or do exact match
      let emailStr = filter.email;
      if (typeof emailStr === 'object' && emailStr.source) {
        // extract string from RegExp e.g. ^foo$ -> foo
        emailStr = emailStr.source.replace(/^\^|\$$/g, '').replace(/\\/g, '');
      }
      conditions.push('LOWER(email) = LOWER(?)');
      params.push(String(emailStr).trim());
    }

    if (conditions.length === 0) {
      return null;
    }

    sql += conditions.join(' AND ') + ' LIMIT 1';
    const rows = await mysqlService.executeQuery(sql, params);
    if (!rows || rows.length === 0) return null;
    return new UserDocument(rows[0]);
  },

  /**
   * Find user by primary key ID
   */
  async findById(id) {
    if (!id) return null;
    const rows = await mysqlService.executeQuery('SELECT * FROM users WHERE _id = ? LIMIT 1', [String(id)]);
    if (!rows || rows.length === 0) return null;
    return new UserDocument(rows[0]);
  },

  /**
   * Find all users (returns chainable query for .sort())
   */
  find(filter = {}, projection = '') {
    return new UserQueryChain(async (sortOpt) => {
      let sql = 'SELECT * FROM users';
      if (sortOpt && sortOpt.createdAt === -1) {
        sql += ' ORDER BY createdAt DESC';
      } else if (sortOpt && sortOpt.createdAt === 1) {
        sql += ' ORDER BY createdAt ASC';
      }
      const rows = await mysqlService.executeQuery(sql);
      return (rows || []).map((r) => new UserDocument(r));
    });
  },

  /**
   * Create new user
   */
  async create(userData = {}) {
    const doc = new UserDocument(userData);
    await doc.save();
    return doc;
  },

  /**
   * Find user and update fields
   */
  async findByIdAndUpdate(id, updateOps = {}, options = {}) {
    const user = await this.findById(id);
    if (!user) return null;

    const fields = updateOps.$set || updateOps;
    if (fields.name !== undefined) user.name = fields.name;
    if (fields.email !== undefined) user.email = fields.email.toLowerCase().trim();
    if (fields.role !== undefined) user.role = fields.role === 'admin' ? 'admin' : 'user';
    if (fields.user_id !== undefined) user.user_id = fields.user_id;
    if (fields.business_groups !== undefined) user.business_groups = fields.business_groups;
    if (fields.businesses !== undefined) user.businesses = fields.businesses;

    await user.save();
    return user;
  },

  /**
   * Find user and delete
   */
  async findByIdAndDelete(id) {
    if (!id) return null;
    const user = await this.findById(id);
    if (!user) return null;
    await mysqlService.executeQuery('DELETE FROM users WHERE _id = ?', [String(id)]);
    return user;
  },

  /**
   * Find user and update or insert (upsert)
   */
  async findOneAndUpdate(filter = {}, updateOps = {}, options = {}) {
    let user = await this.findOne(filter);
    const fields = updateOps.$set || updateOps;
    if (!user) {
      if (options.upsert) {
        user = new UserDocument({ ...filter, ...fields });
        await user.save();
        return user;
      }
      return null;
    }
    if (fields.name !== undefined) user.name = fields.name;
    if (fields.email !== undefined) user.email = fields.email.toLowerCase().trim();
    if (fields.role !== undefined) user.role = fields.role === 'admin' ? 'admin' : 'user';
    if (fields.user_id !== undefined) user.user_id = fields.user_id;
    if (fields.business_groups !== undefined) user.business_groups = fields.business_groups;
    if (fields.businesses !== undefined) user.businesses = fields.businesses;
    await user.save();
    return user;
  }
};

export default User;
