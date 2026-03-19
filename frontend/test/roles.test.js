import assert from "node:assert/strict";
import { hasPermission, PERMISSIONS, ROLES } from "../src/utils/roles.js";

export default [
  {
    name: "admin keeps access to versions and assignment controls",
    run() {
      const admin = { role: ROLES.ADMIN };

      assert.equal(hasPermission(admin, PERMISSIONS.VERSIONS), true);
      assert.equal(hasPermission(admin, PERMISSIONS.BUG_ASSIGN), true);
      assert.equal(hasPermission(admin, PERMISSIONS.BUG_STATUS), true);
    }
  },
  {
    name: "developer can access versions but not assignment controls",
    run() {
      const developer = { role: ROLES.DEVELOPER };

      assert.equal(hasPermission(developer, PERMISSIONS.VERSIONS), true);
      assert.equal(hasPermission(developer, PERMISSIONS.BUG_STATUS), true);
      assert.equal(hasPermission(developer, PERMISSIONS.BUG_ASSIGN), false);
    }
  },
  {
    name: "tester can view versions but cannot update status or assignments",
    run() {
      const tester = { role: ROLES.TESTER };

      assert.equal(hasPermission(tester, PERMISSIONS.VERSIONS), true);
      assert.equal(hasPermission(tester, PERMISSIONS.BUG_STATUS), false);
      assert.equal(hasPermission(tester, PERMISSIONS.BUG_ASSIGN), false);
    }
  }
];
