/**
 * Transient Recovery Voltage (TRV) Simulation
 * Models the voltage across a circuit breaker after fault interruption.
 * Uses RLC circuit model: V(t) response after current zero.
 */
(function () {
  window.MyLibrary = window.MyLibrary || {};

  window.MyLibrary.calculate = function (args) {
    var R = args.resistance; // Ω
    var L = args.inductance; // H
    var C = args.capacitance; // F
    var I0 = args.initialCurrent; // A
    var dt = args.timeStep * 1e-3; // ms to seconds
    var totalTime = args.totalTime * 1e-3; // ms to seconds

    // Natural frequency and damping
    var omega0 = 1.0 / Math.sqrt(L * C);
    var alpha = R / (2 * L);
    var omega_d_sq = omega0 * omega0 - alpha * alpha;

    var x = [];
    var y = [];
    var steps = Math.floor(totalTime / dt);
    if (steps > 10000) steps = 10000;

    if (omega_d_sq > 0) {
      // Underdamped case (oscillatory TRV)
      var omega_d = Math.sqrt(omega_d_sq);
      var V_peak = I0 * Math.sqrt(L / C); // approximate peak TRV

      for (var i = 0; i <= steps; i++) {
        var t = i * dt;
        var voltage = V_peak * (1 - Math.exp(-alpha * t) *
          (Math.cos(omega_d * t) + (alpha / omega_d) * Math.sin(omega_d * t)));
        x.push(t * 1e6); // convert to µs for display
        y.push(voltage / 1000); // convert to kV
      }
    } else if (omega_d_sq === 0) {
      // Critically damped
      var V_peak2 = I0 * Math.sqrt(L / C);
      for (var i2 = 0; i2 <= steps; i2++) {
        var t2 = i2 * dt;
        var voltage2 = V_peak2 * (1 - Math.exp(-alpha * t2) * (1 + alpha * t2));
        x.push(t2 * 1e6);
        y.push(voltage2 / 1000);
      }
    } else {
      // Overdamped
      var s1 = -alpha + Math.sqrt(alpha * alpha - omega0 * omega0);
      var s2 = -alpha - Math.sqrt(alpha * alpha - omega0 * omega0);
      var V_peak3 = I0 * Math.sqrt(L / C);

      for (var i3 = 0; i3 <= steps; i3++) {
        var t3 = i3 * dt;
        var voltage3 = V_peak3 * (1 - (s1 * Math.exp(s2 * t3) - s2 * Math.exp(s1 * t3)) / (s1 - s2));
        x.push(t3 * 1e6);
        y.push(voltage3 / 1000);
      }
    }

    return { x: x, y: y };
  };
})();
