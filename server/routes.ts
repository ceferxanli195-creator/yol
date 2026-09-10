import { Router, Response } from 'express';
import { db, verifyPassword, normalizePhone } from './db';
import { authMiddleware, createToken, requireRole, requirePermission, AuthRequest } from './auth';
import { CustomerRecord, UserPermissions } from './types';

export const router = Router();

// Azerbaijani lowercase helper for case-insensitive search
function azNormalize(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .replace(/Ə/g, 'ə')
    .replace(/Ğ/g, 'ğ')
    .replace(/Ö/g, 'ö')
    .replace(/Ş/g, 'ş')
    .replace(/Ü/g, 'ü')
    .replace(/Ç/g, 'ç');
}

// -------------------------------------------------------------
// 1. AUTHENTICATION (ID + Password only, no email, no phone)
// -------------------------------------------------------------

router.post('/auth/login', (req, res) => {
  try {
    const { loginId, password } = req.body;
    if (!loginId || !password) {
      return res.status(400).json({ error: 'İstifadəçi ID və Şifrə tələb olunur.' });
    }

    const cleanId = loginId.trim().toLowerCase();

    // Check Users first
    const user = db.getUserByLoginId(cleanId);
    if (user) {
      if (!verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: 'Daxil edilən ID və ya Şifrə yanlışdır.' });
      }
      if (user.status === 'inactive') {
        return res.status(403).json({ error: 'Hesabınız deaktiv edilib. Zəhmət olmasa adminlə əlaqə saxlayın.' });
      }

      const now = new Date().toISOString();
      user.lastLogin = now;
      user.lastActivity = now;

      const token = createToken({
        id: user.id,
        loginId: user.loginId,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
      });

      db.addLog({
        userId: user.id,
        userName: user.name,
        role: user.role,
        action: 'LOGIN',
        entityType: 'AUTH',
        details: `${user.name} (${user.loginId}) sistemə daxil oldu.`,
      });

      return res.json({
        token,
        user: {
          id: user.id,
          loginId: user.loginId,
          name: user.name,
          role: user.role,
          status: user.status,
          permissions: user.permissions,
        },
      });
    }

    // Check Drivers
    const driver = db.getDriverByLoginId(cleanId);
    if (driver) {
      if (!verifyPassword(password, driver.passwordHash)) {
        return res.status(401).json({ error: 'Daxil edilən ID və ya Şifrə yanlışdır.' });
      }
      if (driver.status === 'inactive') {
        return res.status(403).json({ error: 'Sürücü hesabı deaktiv edilib.' });
      }

      const driverPermissions: UserPermissions = {
        view_customers: true,
        create_customer: false,
        edit_customer: false,
        delete_customer: false,
        use_gps: true,
        view_map: true,
        backup_data: false,
        restore_data: false,
        view_drivers: false,
      };

      const token = createToken({
        id: driver.id,
        loginId: driver.loginId,
        name: driver.name,
        role: 'DRIVER',
        permissions: driverPermissions,
      });

      db.addLog({
        userId: driver.id,
        userName: driver.name,
        role: 'DRIVER',
        action: 'LOGIN',
        entityType: 'AUTH',
        details: `Sürücü ${driver.name} (${driver.loginId}) sistemə daxil oldu.`,
      });

      return res.json({
        token,
        user: {
          id: driver.id,
          loginId: driver.loginId,
          name: driver.name,
          role: 'DRIVER',
          status: driver.status,
          permissions: driverPermissions,
        },
      });
    }

    return res.status(401).json({ error: 'Daxil edilən ID və ya Şifrə yanlışdır.' });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Giriş zamanı xəta baş verdi. Yenidən cəhd edin.' });
  }
});

router.post('/auth/logout', authMiddleware, (req: AuthRequest, res) => {
  if (req.user) {
    db.addLog({
      userId: req.user.id,
      userName: req.user.name,
      role: req.user.role,
      action: 'LOGOUT',
      entityType: 'AUTH',
      details: `${req.user.name} sistemdən çıxış etdi.`,
    });
  }
  return res.json({ success: true });
});

router.get('/auth/me', authMiddleware, (req: AuthRequest, res) => {
  return res.json({ user: req.user });
});

router.put('/auth/change-password', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'Yeni şifrə ən azı 4 simvol olmalıdır.' });
    }

    if (req.user?.role === 'DRIVER') {
      const driver = db.getDriverById(req.user.id);
      if (!driver || !verifyPassword(oldPassword, driver.passwordHash)) {
        return res.status(400).json({ error: 'Cari şifrə yanlışdır.' });
      }
      db.updateDriver(driver.id, { password: newPassword });
    } else if (req.user) {
      const user = db.getUserById(req.user.id);
      if (!user || !verifyPassword(oldPassword, user.passwordHash)) {
        return res.status(400).json({ error: 'Cari şifrə yanlışdır.' });
      }
      db.updateUser(user.id, { password: newPassword });
    }

    db.addLog({
      userId: req.user!.id,
      userName: req.user!.name,
      role: req.user!.role,
      action: 'UPDATE_PASSWORD',
      entityType: 'USER',
      details: `${req.user!.name} öz şifrəsini yenilədi.`,
    });

    return res.json({ success: true, message: 'Şifrə uğurla dəyişdirildi.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Xəta baş verdi.' });
  }
});

// -------------------------------------------------------------
// 2. DASHBOARD STATS
// -------------------------------------------------------------

router.get('/dashboard/stats', authMiddleware, (req: AuthRequest, res) => {
  try {
    const role = req.user!.role;
    const userId = req.user!.id;
    const allCustomers = db.getCustomers(true);
    const activeCustomers = allCustomers.filter(c => !c.isDeleted);
    const deletedCustomers = allCustomers.filter(c => c.isDeleted);
    const users = db.getUsers();
    const drivers = db.getDrivers();
    const allLogs = db.getLogs();

    if (role === 'ADMIN') {
      const recentCustomers = activeCustomers.slice(0, 5);
      const recentActivities = allLogs.slice(0, 8);

      return res.json({
        totalUsers: users.length,
        activeUsers: users.filter(u => u.status === 'active').length,
        totalCustomers: activeCustomers.length,
        activeCustomers: activeCustomers.length,
        deletedCustomers: deletedCustomers.length,
        totalDrivers: drivers.length,
        activeDrivers: drivers.filter(d => d.status === 'active').length,
        recentCustomers,
        recentActivities,
      });
    }

    if (role === 'USER') {
      const userActive = activeCustomers.filter(c => c.ownerId === userId);
      const userDeleted = deletedCustomers.filter(c => c.ownerId === userId);
      const userLogs = allLogs.filter(l => l.userId === userId).slice(0, 8);

      return res.json({
        totalCustomers: userActive.length,
        activeCustomers: userActive.length,
        deletedCustomers: userDeleted.length,
        recentCustomers: userActive.slice(0, 5),
        recentActivities: userLogs,
      });
    }

    // DRIVER view
    const userGroups = users
      .filter(u => u.role === 'USER' || u.role === 'ADMIN')
      .map(u => ({
        userId: u.id,
        userName: u.name,
        customerCount: activeCustomers.filter(c => c.ownerId === u.id).length,
      }));

    return res.json({
      totalCustomers: activeCustomers.length,
      userGroups,
      totalDrivers: drivers.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Statistika yüklənərkən xəta baş verdi.' });
  }
});

// -------------------------------------------------------------
// 3. CUSTOMERS (Strict data isolation & search)
// -------------------------------------------------------------

router.get('/customers', authMiddleware, requirePermission('view_customers'), (req: AuthRequest, res) => {
  try {
    const { search, ownerId } = req.query;
    const role = req.user!.role;
    const currentUserId = req.user!.id;

    let list = db.getCustomers(false); // active only

    // STRICT ISOLATION: Normal USER can ONLY see their own customers
    if (role === 'USER') {
      list = list.filter(c => c.ownerId === currentUserId);
    } else if (ownerId && typeof ownerId === 'string') {
      list = list.filter(c => c.ownerId === ownerId);
    }

    // Search query
    if (search && typeof search === 'string' && search.trim()) {
      const q = azNormalize(search);
      const qDigits = search.replace(/\D/g, '');

      list = list.filter(c => {
        const nameMatch = azNormalize(c.fullName).includes(q);
        const addressMatch = azNormalize(c.address).includes(q);
        const notesMatch = azNormalize(c.notes || '').includes(q);
        const rawPhoneMatch = c.phone.includes(search.trim());
        const normPhoneMatch = qDigits.length >= 3 && (
          c.phoneNormalized.includes(qDigits) ||
          normalizePhone(c.phone).includes(qDigits)
        );

        return nameMatch || addressMatch || notesMatch || rawPhoneMatch || normPhoneMatch;
      });
    }

    // Enrich with owner info for Admin and Driver
    const usersMap = new Map(db.getUsers().map(u => [u.id, u.name]));
    const enriched = list.map(c => ({
      ...c,
      ownerName: usersMap.get(c.ownerId) || 'Bilinməyən',
    }));

    return res.json({ customers: enriched });
  } catch (err: any) {
    return res.status(500).json({ error: 'Müştərilər yüklənərkən xəta baş verdi.' });
  }
});

router.get('/customers/:id', authMiddleware, (req: AuthRequest, res) => {
  try {
    const customer = db.getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Müştəri tapılmadı.' });
    }

    // Strict check: if USER, customer must belong to them
    if (req.user!.role === 'USER' && customer.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Bu müştərini görmək icazəniz yoxdur.' });
    }

    const owner = db.getUserById(customer.ownerId);
    return res.json({
      customer: {
        ...customer,
        ownerName: owner?.name || 'Bilinməyən',
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Müştəri məlumatı yüklənmədi.' });
  }
});

router.post('/customers', authMiddleware, requirePermission('create_customer'), (req: AuthRequest, res) => {
  try {
    const { firstName, lastName, phone, address, notes, latitude, longitude, accuracy, photoUrl, ownerId } = req.body;

    if (!firstName || !phone || !address) {
      return res.status(400).json({ error: 'Ad, telefon və ünvan vacib sahələrdir.' });
    }

    // User is forced to be the owner; Admin can assign to someone else
    let assignedOwnerId = req.user!.id;
    if (req.user!.role === 'ADMIN' && ownerId) {
      const targetUser = db.getUserById(ownerId);
      if (!targetUser) {
        return res.status(400).json({ error: 'Təyin edilən sahib istifadəçi tapılmadı.' });
      }
      assignedOwnerId = targetUser.id;
    }

    const customer = db.createCustomer({
      ownerId: assignedOwnerId,
      createdBy: req.user!.id,
      firstName,
      lastName: lastName || '',
      phone,
      address,
      notes,
      latitude: Number(latitude) || 0,
      longitude: Number(longitude) || 0,
      accuracy: Number(accuracy) || 0,
      photoUrl,
    });

    db.addLog({
      userId: req.user!.id,
      userName: req.user!.name,
      role: req.user!.role,
      action: 'CREATE_CUSTOMER',
      entityType: 'CUSTOMER',
      entityId: customer.id,
      customerId: customer.id,
      customerName: customer.fullName,
      details: `${req.user!.name} yeni müştəri əlavə etdi: ${customer.fullName} (${customer.phone})`,
      newData: customer,
    });

    return res.status(201).json({ customer });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Müştəri əlavə edilərkən xəta baş verdi.' });
  }
});

router.put('/customers/:id', authMiddleware, requirePermission('edit_customer'), (req: AuthRequest, res) => {
  try {
    const customer = db.getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Müştəri tapılmadı.' });
    }

    // Strict ownership: USER cannot edit someone else's customer
    if (req.user!.role === 'USER' && customer.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Bu müştərini redaktə etmək icazəniz yoxdur.' });
    }

    const { firstName, lastName, phone, address, notes, latitude, longitude, accuracy, photoUrl, ownerId, status } = req.body;

    const oldData = { ...customer };
    const updates: Partial<CustomerRecord> & { updatedBy: string } = {
      updatedBy: req.user!.id,
    };

    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (phone !== undefined) updates.phone = phone;
    if (address !== undefined) updates.address = address;
    if (notes !== undefined) updates.notes = notes;
    if (latitude !== undefined) updates.latitude = latitude;
    if (longitude !== undefined) updates.longitude = longitude;
    if (accuracy !== undefined) updates.accuracy = accuracy;
    if (photoUrl !== undefined) updates.photoUrl = photoUrl;
    if (status !== undefined) updates.status = status;

    // OWNER CHANGE: Only ADMIN can change owner!
    let ownerChanged = false;
    let oldOwnerName = '';
    let newOwnerName = '';

    if (ownerId && ownerId !== customer.ownerId) {
      if (req.user!.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Yalnız Admin müştərinin sahibini dəyişə bilər.' });
      }
      const newOwner = db.getUserById(ownerId);
      if (!newOwner) {
        return res.status(400).json({ error: 'Yeni sahib istifadəçi tapılmadı.' });
      }
      const oldOwner = db.getUserById(customer.ownerId);
      oldOwnerName = oldOwner?.name || customer.ownerId;
      newOwnerName = newOwner.name;
      updates.ownerId = ownerId;
      ownerChanged = true;
    }

    const updated = db.updateCustomer(customer.id, updates);

    if (ownerChanged) {
      db.addLog({
        userId: req.user!.id,
        userName: req.user!.name,
        role: req.user!.role,
        action: 'CHANGE_OWNER',
        entityType: 'CUSTOMER',
        entityId: customer.id,
        customerId: customer.id,
        customerName: updated.fullName,
        details: `Admin müştərinin sahibini dəyişdi: "${updated.fullName}" (${oldOwnerName} -> ${newOwnerName})`,
        oldData: { ownerId: oldData.ownerId, ownerName: oldOwnerName },
        newData: { ownerId: updated.ownerId, ownerName: newOwnerName },
      });
    } else {
      db.addLog({
        userId: req.user!.id,
        userName: req.user!.name,
        role: req.user!.role,
        action: 'UPDATE_CUSTOMER',
        entityType: 'CUSTOMER',
        entityId: customer.id,
        customerId: customer.id,
        customerName: updated.fullName,
        details: `${req.user!.name} müştəri məlumatlarını yenilədi: ${updated.fullName}`,
        oldData,
        newData: updated,
      });
    }

    return res.json({ customer: updated });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Müştəri yenilənərkən xəta baş verdi.' });
  }
});

router.delete('/customers/:id', authMiddleware, requirePermission('delete_customer'), (req: AuthRequest, res) => {
  try {
    const customer = db.getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Müştəri tapılmadı.' });
    }

    // Strict ownership: USER cannot delete someone else's customer
    if (req.user!.role === 'USER' && customer.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Bu müştərini silmək icazəniz yoxdur.' });
    }

    const deleted = db.softDeleteCustomer(customer.id, req.user!.id);

    db.addLog({
      userId: req.user!.id,
      userName: req.user!.name,
      role: req.user!.role,
      action: 'DELETE_CUSTOMER',
      entityType: 'CUSTOMER',
      entityId: customer.id,
      customerId: customer.id,
      customerName: customer.fullName,
      details: `${req.user!.name} müştərini sildi (Zibil qutusuna köçürüldü): ${customer.fullName}`,
    });

    return res.json({ success: true, customer: deleted });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Müştəri silinərkən xəta baş verdi.' });
  }
});

// -------------------------------------------------------------
// 4. TRASH & RESTORE
// -------------------------------------------------------------

router.get('/trash', authMiddleware, (req: AuthRequest, res) => {
  try {
    const role = req.user!.role;
    const all = db.getCustomers(true).filter(c => c.isDeleted);
    const usersMap = new Map(db.getUsers().map(u => [u.id, u.name]));

    let list = all;
    if (role === 'USER') {
      list = all.filter(c => c.ownerId === req.user!.id);
    }

    const enriched = list.map(c => ({
      ...c,
      ownerName: usersMap.get(c.ownerId) || 'Bilinməyən',
      deletedByName: c.deletedBy ? usersMap.get(c.deletedBy) || 'İstifadəçi' : 'Naməlum',
    }));

    return res.json({ trash: enriched });
  } catch (err: any) {
    return res.status(500).json({ error: 'Zibil qutusu yüklənmədi.' });
  }
});

router.post('/customers/:id/restore', authMiddleware, (req: AuthRequest, res) => {
  try {
    const customer = db.getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Müştəri tapılmadı.' });
    }
    if (req.user!.role === 'USER' && customer.ownerId !== req.user!.id) {
      return res.status(403).json({ error: 'Bu müştərini bərpa etmək icazəniz yoxdur.' });
    }

    const restored = db.restoreCustomer(customer.id, req.user!.id);

    db.addLog({
      userId: req.user!.id,
      userName: req.user!.name,
      role: req.user!.role,
      action: 'RESTORE_CUSTOMER',
      entityType: 'CUSTOMER',
      entityId: customer.id,
      customerId: customer.id,
      customerName: customer.fullName,
      details: `${req.user!.name} müştərini bərpa etdi: ${customer.fullName}`,
    });

    return res.json({ success: true, customer: restored });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Müştəri bərpa edilərkən xəta baş verdi.' });
  }
});

router.delete('/customers/:id/permanent', authMiddleware, requireRole('ADMIN'), (req: AuthRequest, res) => {
  try {
    const customer = db.getCustomerById(req.params.id);
    if (!customer) {
      return res.status(404).json({ error: 'Müştəri tapılmadı.' });
    }

    db.permanentDeleteCustomer(customer.id);

    db.addLog({
      userId: req.user!.id,
      userName: req.user!.name,
      role: 'ADMIN',
      action: 'PERMANENT_DELETE_CUSTOMER',
      entityType: 'CUSTOMER',
      entityId: customer.id,
      details: `Admin müştərini həmişəlik sildi: ${customer.fullName}`,
    });

    return res.json({ success: true, message: 'Müştəri həmişəlik silindi.' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Xəta baş verdi.' });
  }
});

// -------------------------------------------------------------
// 5. USERS MANAGEMENT (ADMIN ONLY)
// -------------------------------------------------------------

router.get('/users', authMiddleware, requireRole('ADMIN'), (req: AuthRequest, res) => {
  try {
    const users = db.getUsers();
    const customers = db.getCustomers(false);

    const enriched = users.map(u => ({
      id: u.id,
      loginId: u.loginId,
      name: u.name,
      role: u.role,
      status: u.status,
      permissions: u.permissions,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      lastLogin: u.lastLogin,
      lastActivity: u.lastActivity,
      customerCount: customers.filter(c => c.ownerId === u.id).length,
    }));

    return res.json({ users: enriched });
  } catch (err: any) {
    return res.status(500).json({ error: 'İstifadəçilər yüklənmədi.' });
  }
});

router.post('/users', authMiddleware, requireRole('ADMIN'), (req: AuthRequest, res) => {
  try {
    const { loginId, password, name, role, status, permissions } = req.body;
    if (!loginId || !password || !name) {
      return res.status(400).json({ error: 'İstifadəçi ID, şifrə və ad tələb olunur.' });
    }

    const newUser = db.createUser({
      loginId,
      password,
      name,
      role: role || 'USER',
      status: status || 'active',
      permissions,
    });

    db.addLog({
      userId: req.user!.id,
      userName: req.user!.name,
      role: 'ADMIN',
      action: 'CREATE_USER',
      entityType: 'USER',
      entityId: newUser.id,
      details: `Admin yeni istifadəçi yaratdı: ${newUser.name} (${newUser.loginId}) [Rol: ${newUser.role}]`,
    });

    return res.status(201).json({
      user: {
        id: newUser.id,
        loginId: newUser.loginId,
        name: newUser.name,
        role: newUser.role,
        status: newUser.status,
        permissions: newUser.permissions,
        createdAt: newUser.createdAt,
      }
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'İstifadəçi yaradıla bilmədi.' });
  }
});

router.put('/users/:id', authMiddleware, requireRole('ADMIN'), (req: AuthRequest, res) => {
  try {
    const { name, password, role, status, permissions } = req.body;
    const user = db.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'İstifadəçi tapılmadı.' });
    }

    const updated = db.updateUser(user.id, {
      name,
      password: password && password.trim().length > 0 ? password.trim() : undefined,
      role,
      status,
      permissions,
    });

    db.addLog({
      userId: req.user!.id,
      userName: req.user!.name,
      role: 'ADMIN',
      action: 'UPDATE_USER',
      entityType: 'USER',
      entityId: updated.id,
      details: `Admin istifadəçini redaktə etdi: ${updated.name} (${updated.loginId})`,
    });

    return res.json({
      user: {
        id: updated.id,
        loginId: updated.loginId,
        name: updated.name,
        role: updated.role,
        status: updated.status,
        permissions: updated.permissions,
        updatedAt: updated.updatedAt,
      }
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'İstifadəçi yenilənmədi.' });
  }
});

router.delete('/users/:id', authMiddleware, requireRole('ADMIN'), (req: AuthRequest, res) => {
  try {
    const user = db.getUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'İstifadəçi tapılmadı.' });
    }

    db.deleteUser(user.id);

    db.addLog({
      userId: req.user!.id,
      userName: req.user!.name,
      role: 'ADMIN',
      action: 'DELETE_USER',
      entityType: 'USER',
      entityId: user.id,
      details: `Admin istifadəçini sildi: ${user.name} (${user.loginId})`,
    });

    return res.json({ success: true, message: 'İstifadəçi silindi.' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'İstifadəçi silinmədi.' });
  }
});

// -------------------------------------------------------------
// 6. DRIVERS MANAGEMENT
// -------------------------------------------------------------

router.get('/drivers', authMiddleware, (req: AuthRequest, res) => {
  try {
    const drivers = db.getDrivers().map(d => ({
      id: d.id,
      loginId: d.loginId,
      name: d.name,
      phone: d.phone,
      status: d.status,
      createdAt: d.createdAt,
      updatedAt: d.updatedAt,
    }));
    return res.json({ drivers });
  } catch (err: any) {
    return res.status(500).json({ error: 'Sürücülər yüklənmədi.' });
  }
});

router.post('/drivers', authMiddleware, requireRole('ADMIN'), (req: AuthRequest, res) => {
  try {
    const { loginId, password, name, phone, status } = req.body;
    if (!loginId || !password || !name || !phone) {
      return res.status(400).json({ error: 'Bütün sahələr doldurulmalıdır.' });
    }

    const driver = db.createDriver({
      loginId,
      password,
      name,
      phone,
      status: status || 'active',
    });

    db.addLog({
      userId: req.user!.id,
      userName: req.user!.name,
      role: 'ADMIN',
      action: 'CREATE_DRIVER',
      entityType: 'DRIVER',
      entityId: driver.id,
      details: `Admin yeni sürücü əlavə etdi: ${driver.name} (${driver.phone})`,
    });

    return res.status(201).json({ driver });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Sürücü yaradıla bilmədi.' });
  }
});

router.put('/drivers/:id', authMiddleware, requireRole('ADMIN'), (req: AuthRequest, res) => {
  try {
    const { name, phone, password, status } = req.body;
    const updated = db.updateDriver(req.params.id, {
      name,
      phone,
      password: password && password.trim().length > 0 ? password.trim() : undefined,
      status,
    });

    db.addLog({
      userId: req.user!.id,
      userName: req.user!.name,
      role: 'ADMIN',
      action: 'UPDATE_DRIVER',
      entityType: 'DRIVER',
      entityId: updated.id,
      details: `Admin sürücünü redaktə etdi: ${updated.name}`,
    });

    return res.json({ driver: updated });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Sürücü yenilənmədi.' });
  }
});

router.delete('/drivers/:id', authMiddleware, requireRole('ADMIN'), (req: AuthRequest, res) => {
  try {
    const driver = db.getDriverById(req.params.id);
    if (!driver) return res.status(404).json({ error: 'Sürücü tapılmadı.' });

    db.deleteDriver(driver.id);

    db.addLog({
      userId: req.user!.id,
      userName: req.user!.name,
      role: 'ADMIN',
      action: 'DELETE_DRIVER',
      entityType: 'DRIVER',
      entityId: driver.id,
      details: `Admin sürücünü sildi: ${driver.name}`,
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(400).json({ error: err.message || 'Sürücü silinmədi.' });
  }
});

// -------------------------------------------------------------
// 7. AUDIT LOGS
// -------------------------------------------------------------

router.get('/logs', authMiddleware, (req: AuthRequest, res) => {
  try {
    const { search, action, entityType } = req.query;
    let logs = db.getLogs();

    // Normal USER can only see own logs
    if (req.user!.role === 'USER') {
      logs = logs.filter(l => l.userId === req.user!.id);
    } else if (req.user!.role === 'DRIVER') {
      return res.status(403).json({ error: 'Sürücünün tarixçəyə giriş hüququ yoxdur.' });
    }

    if (action && typeof action === 'string') {
      logs = logs.filter(l => l.action === action);
    }
    if (entityType && typeof entityType === 'string') {
      logs = logs.filter(l => l.entityType === entityType);
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = azNormalize(search);
      logs = logs.filter(l =>
        azNormalize(l.details).includes(q) ||
        azNormalize(l.userName).includes(q) ||
        azNormalize(l.action).includes(q) ||
        azNormalize(l.customerName || '').includes(q)
      );
    }

    return res.json({ logs });
  } catch (err: any) {
    return res.status(500).json({ error: 'Tarixçə yüklənmədi.' });
  }
});

router.delete('/logs', authMiddleware, requireRole('ADMIN'), (req: AuthRequest, res) => {
  try {
    const { logIds, all } = req.body;
    if (all === true) {
      db.clearAllLogs();
      db.addLog({
        userId: req.user!.id,
        userName: req.user!.name,
        role: 'ADMIN',
        action: 'DELETE_LOGS',
        entityType: 'LOG',
        details: `Admin bütün audit tarixçəsini təmizlədi.`,
      });
      return res.json({ success: true, message: 'Bütün tarixçə silindi.' });
    }

    if (Array.isArray(logIds) && logIds.length > 0) {
      const deletedCount = db.deleteLogs(logIds);
      db.addLog({
        userId: req.user!.id,
        userName: req.user!.name,
        role: 'ADMIN',
        action: 'DELETE_LOGS',
        entityType: 'LOG',
        details: `Admin ${deletedCount} ədəd tarixçə qeydini sildi.`,
      });
      return res.json({ success: true, count: deletedCount });
    }

    return res.status(400).json({ error: 'Silinəcək loglar seçilməyib.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Tarixçə silinərkən xəta baş verdi.' });
  }
});

// -------------------------------------------------------------
// 8. BACKUP & RESTORE
// -------------------------------------------------------------

router.get('/backup/export', authMiddleware, requirePermission('backup_data'), (req: AuthRequest, res) => {
  try {
    const role = req.user!.role;
    let customers = db.getCustomers(false);

    if (role === 'USER') {
      customers = customers.filter(c => c.ownerId === req.user!.id);
    }

    const backupPayload = {
      system: 'Müştəri GPS',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: {
        id: req.user!.id,
        loginId: req.user!.loginId,
        name: req.user!.name,
        role: req.user!.role,
      },
      customersCount: customers.length,
      customers,
    };

    db.addLog({
      userId: req.user!.id,
      userName: req.user!.name,
      role: req.user!.role,
      action: 'BACKUP',
      entityType: 'BACKUP',
      details: `${req.user!.name} tərəfindən ${customers.length} müştəri backup olaraq export edildi.`,
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=mustari_gps_backup_${Date.now()}.json`);
    return res.send(JSON.stringify(backupPayload, null, 2));
  } catch (err: any) {
    return res.status(500).json({ error: 'Backup yaradılarkən xəta baş verdi.' });
  }
});

router.post('/backup/restore', authMiddleware, requirePermission('restore_data'), (req: AuthRequest, res) => {
  try {
    const { backupData } = req.body;
    if (!backupData || !Array.isArray(backupData.customers)) {
      return res.status(400).json({ error: 'Keçərsiz backup faylı formatı. JSON daxilində "customers" massivi tapılmadı.' });
    }

    const incomingCustomers = backupData.customers;
    let restoredCount = 0;

    for (const item of incomingCustomers) {
      if (!item.firstName || !item.phone) continue;

      // CRITICAL SECURITY RULE: USER restore ALWAYS forces ownerId to be the current user
      const targetOwnerId = req.user!.role === 'ADMIN' && item.ownerId ? item.ownerId : req.user!.id;

      db.createCustomer({
        ownerId: targetOwnerId,
        createdBy: req.user!.id,
        firstName: item.firstName,
        lastName: item.lastName || '',
        phone: item.phone,
        address: item.address || 'Ünvan qeyd edilməyib',
        notes: item.notes || '',
        latitude: Number(item.latitude) || 0,
        longitude: Number(item.longitude) || 0,
        accuracy: Number(item.accuracy) || 0,
        photoUrl: item.photoUrl || '',
      });
      restoredCount++;
    }

    db.addLog({
      userId: req.user!.id,
      userName: req.user!.name,
      role: req.user!.role,
      action: 'RESTORE',
      entityType: 'BACKUP',
      details: `${req.user!.name} backup vasitəsilə ${restoredCount} müştərini bərpa etdi.`,
    });

    return res.json({ success: true, count: restoredCount, message: `${restoredCount} müştəri uğurla bərpa olundu.` });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Restore zamanı xəta baş verdi.' });
  }
});
