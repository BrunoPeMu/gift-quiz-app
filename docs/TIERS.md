# Tiers y Créditos

## Definiciones

| Tier | Créditos | Contexto máximo | Subida PDF | Rollover | ¿Paga? |
|---|---|---|---|---|---|
| `guest` | 2/día | 10 000 chars | No | No | No |
| `free` | 3/día | 10 000 chars | No | No | No |
| `basic` | 30/mes (añaditivos) | 10 000 chars | No | Sí | 4,99 €/mes o 49,90 €/año |
| `pro` | 50/día | 100 000 chars | Sí | No | 9,98 €/mes o 99,80 €/año |

### Detalle del rollover en `basic`

Los créditos no gastados un mes se acumulan al siguiente. Ejemplo:

- Mes 1: 30 créditos → usa 20 → le quedan 10.
- Mes 2: se añaden 30 → tiene 40.
- Mes 3: se añaden 30 → tiene 70 (sin límite superior).

### Pro: por qué 50/día y no ∞

Aunque pro se comercializa como "ilimitado", el backend limita a 50 generaciones/día para evitar abuso del gasto de API. 50/día es suficiente para un uso académico intensivo (~1 generación cada 10 minutos durante 8 horas).

### Créditos para `basic` vs `free`

- **Free**: 3 créditos/día con reseteo diario. El refill frontend añade +3 al mes (cap 9). En el backend se resetea a 3 cada día.
- **Basic**: 30 créditos/mes con rollover. El refill frontend añade 30 al inicio de cada mes (sin cap).

## Lógica de descuento (backend)

Ver `checkAndDeductCredits` en `functions/src/index.ts`:

- `free`: reseteo diario a 3 créditos si es un nuevo día, descuenta 1.
- `pro`: siempre retorna `true` (no descuenta).
- `basic` y otros: descuenta del contador `credits`.
- `guest`: no se descuenta (sin UID) — actualmente bloqueado por IA.

## Refill (frontend)

Ver `checkMonthlyCreditRefill` en `src/services/userService.ts`:

- Se ejecuta al iniciar sesión.
- Si el último reseteo fue en un mes anterior, se añaden créditos.
- La lógica discrimina por `tier`:
  - `free`: +3, cap 9.
  - `basic`: +30, sin cap.
  - `pro`: no aplica.
  - `guest`/sin tier: +3, cap 9.
