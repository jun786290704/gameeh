/* ============================================================================
 *  Element Heroes — 轻量物理引擎（本地内置，离线可用）
 *  用途：角色与建筑 / 树木 / 岩石之间的碰撞解算，杜绝「穿模」。
 *  设计：动态刚体（角色，球体） + 静态障碍物（竖直圆柱，仅做 XZ 平面圆-圆碰撞）。
 *  碰撞体只用于「垂直墙面」类障碍：树、岩石、以及建筑主体（站上顶面后挡住内部）。
 *  建筑的台基是缓斜面，不注册碰撞体 —— 由地图的 standHeightAt() 直接把角色托在斜面上，
 *  脚底恒在表面，既不会陷入，也不会出现「碰撞把人挡在斜面外、因而永远走不上去」的死锁。
 *  重力在此场景由地形高度函数 heightAt 处理，故世界重力设为 0，仅做碰撞响应。
 *  暴露全局：window.PHYSICS = { World, Body, clamp }
 * ========================================================================== */
(function (global) {
  'use strict';

  function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

  /* 粗筛半径（米）的平方：只解算落在这个范围内的障碍。
     地图有 700+ 个障碍，全量解算每帧要上万次判定；而角色单步位移不到 1m，
     60m 的余量绰绰有余，不会漏掉任何碰撞。 */
  var CULL2 = 60 * 60;

  // 动态刚体
  function Body(opts) {
    opts = opts || {};
    return {
      pos: { x: opts.x || 0, y: opts.y || 0, z: opts.z || 0 },
      velocity: { x: 0, y: 0, z: 0 },
      mass: opts.mass || 0,
      shape: opts.shape || null,
      _static: (opts.mass === 0)
    };
  }

  function World(opts) {
    opts = opts || {};
    this.gravity = (opts.gravity != null) ? opts.gravity : -9.82;
    this.iterations = opts.iterations || 4;
    this.bodies = [];
  }

  World.prototype.addBody = function (b) {
    b._static = (b.mass === 0);
    this.bodies.push(b);
    return b;
  };

  // 单步积分 + 碰撞解算
  World.prototype.step = function (dt) {
    if (dt > 0.05) dt = 0.05;            // 防止卡顿后大跨步穿透
    var sub = 2, h = dt / sub;
    for (var s = 0; s < sub; s++) this._substep(h);
  };

  World.prototype._substep = function (h) {
    var bs = this.bodies, i, j, d, o;
    // 1) 积分动态体
    for (i = 0; i < bs.length; i++) {
      d = bs[i];
      if (d._static) continue;
      d.velocity.y += this.gravity * h;
      d.pos.x += d.velocity.x * h;
      d.pos.y += d.velocity.y * h;
      d.pos.z += d.velocity.z * h;
    }
    // 2) 迭代解算碰撞（动态体 vs 静态体）
    for (var it = 0; it < this.iterations; it++) {
      for (i = 0; i < bs.length; i++) {
        d = bs[i];
        if (d._static) continue;
        if (!d.shape) continue;
        for (j = 0; j < bs.length; j++) {
          if (i === j) continue;
          o = bs[j];
          if (!o._static) continue;       // 单角色场景无需动态-动态解算
          if (!o.shape) continue;
          if (o.shape.cx != null) {
            var ddx = d.pos.x - o.shape.cx, ddz = d.pos.z - o.shape.cz;
            if (ddx * ddx + ddz * ddz > CULL2) continue;
          }
          resolve(d, o);
        }
      }
    }
  };

  function resolve(d, o) {
    if (d.shape.type === 'sphere' && o.shape.type === 'cylinder') sphereCyl(d, o);
    else if (d.shape.type === 'sphere' && o.shape.type === 'sphere') sphereSphere(d, o);
  }

  // 球体（角色）vs 竖直圆柱（树 / 岩石 / 建筑主体，仅 XZ）
  function sphereCyl(d, o) {
    var dx = d.pos.x - o.shape.cx, dz = d.pos.z - o.shape.cz;
    var rr = d.shape.r + o.shape.r;
    var d2 = dx * dx + dz * dz;
    if (d2 >= rr * rr) return;
    var dist = Math.sqrt(d2);
    var nx, nz;
    if (dist < 1e-4) { nx = 1; nz = 0; dist = 1e-4; }   // 正落在圆心时方向退化，任选一个方向推出
    else { nx = dx / dist; nz = dz / dist; }
    var pen = rr - dist;
    d.pos.x += nx * pen;
    d.pos.z += nz * pen;
    var vn = d.velocity.x * nx + d.velocity.z * nz;
    if (vn < 0) { d.velocity.x -= vn * nx; d.velocity.z -= vn * nz; }
  }

  // 球体 vs 球体（备用）
  function sphereSphere(d, o) {
    var dx = d.pos.x - o.pos.x, dy = d.pos.y - o.pos.y, dz = d.pos.z - o.pos.z;
    var rr = d.shape.r + o.shape.r;
    var d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= rr * rr) return;
    var dist = Math.sqrt(d2) || 1e-4;
    var nx = dx / dist, ny = dy / dist, nz = dz / dist;
    var pen = rr - dist;
    d.pos.x += nx * pen; d.pos.y += ny * pen; d.pos.z += nz * pen;
    var vn = d.velocity.x * nx + d.velocity.y * ny + d.velocity.z * nz;
    if (vn < 0) { d.velocity.x -= vn * nx; d.velocity.y -= vn * ny; d.velocity.z -= vn * nz; }
  }

  global.PHYSICS = { World: World, Body: Body, clamp: clamp };

  if (typeof module !== 'undefined' && module.exports) module.exports = global.PHYSICS;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
