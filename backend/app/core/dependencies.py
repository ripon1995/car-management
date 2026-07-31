"""Centralized FastAPI dependency providers.

Every feature used to construct its own repository/service graph inline in
its own service.py, including repositories from *other* features (e.g.
CarService needed CarOwnerRepository/DriverRepository). That meant each
service.py both imported its sibling repositories directly and duplicated
the `Repository(db)` wiring. This module is the single place that knows how
to build every repository and service, wired together via `Depends`, so
routers depend on `get_<feature>_service` from here instead of from each
feature's own service.py.
"""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.features.auth.repository import UserRepository
from app.features.auth.service import AuthService
from app.features.car_docs.repository import CarDocRepository
from app.features.car_docs.service import CarDocService
from app.features.car_owners.repository import CarOwnerRepository
from app.features.car_owners.service import CarOwnerService
from app.features.cars.repository import CarRepository
from app.features.cars.service import CarService
from app.features.drivers.repository import DriverRepository
from app.features.drivers.service import DriverService
from app.features.fuel.repository import FuelRepository
from app.features.fuel.service import FuelService
from app.features.income.repository import IncomeRepository
from app.features.income.service import IncomeService
from app.features.leases.repository import LeaseRepository
from app.features.leases.service import LeaseService
from app.features.maintenance.repository import MaintenanceRepository
from app.features.maintenance.service import MaintenanceService
from app.features.payments.repository import PaymentRepository
from app.features.payments.service import PaymentService
from app.features.revenue.service import RevenueService
from app.features.vendors.repository import VendorRepository
from app.features.vendors.service import VendorService

# --- Repository providers ---


def get_user_repository(db: AsyncSession = Depends(get_db)) -> UserRepository:
    return UserRepository(db)


def get_car_owner_repository(db: AsyncSession = Depends(get_db)) -> CarOwnerRepository:
    return CarOwnerRepository(db)


def get_vendor_repository(db: AsyncSession = Depends(get_db)) -> VendorRepository:
    return VendorRepository(db)


def get_driver_repository(db: AsyncSession = Depends(get_db)) -> DriverRepository:
    return DriverRepository(db)


def get_car_repository(db: AsyncSession = Depends(get_db)) -> CarRepository:
    return CarRepository(db)


def get_maintenance_repository(db: AsyncSession = Depends(get_db)) -> MaintenanceRepository:
    return MaintenanceRepository(db)


def get_car_doc_repository(db: AsyncSession = Depends(get_db)) -> CarDocRepository:
    return CarDocRepository(db)


def get_fuel_repository(db: AsyncSession = Depends(get_db)) -> FuelRepository:
    return FuelRepository(db)


def get_lease_repository(db: AsyncSession = Depends(get_db)) -> LeaseRepository:
    return LeaseRepository(db)


def get_income_repository(db: AsyncSession = Depends(get_db)) -> IncomeRepository:
    return IncomeRepository(db)


def get_payment_repository(db: AsyncSession = Depends(get_db)) -> PaymentRepository:
    return PaymentRepository(db)


# --- Service providers ---


def get_auth_service(repository: UserRepository = Depends(get_user_repository)) -> AuthService:
    return AuthService(repository)


def get_car_owner_service(
    repository: CarOwnerRepository = Depends(get_car_owner_repository),
) -> CarOwnerService:
    return CarOwnerService(repository)


def get_vendor_service(
    repository: VendorRepository = Depends(get_vendor_repository),
) -> VendorService:
    return VendorService(repository)


def get_driver_service(
    repository: DriverRepository = Depends(get_driver_repository),
) -> DriverService:
    return DriverService(repository)


def get_car_service(
    repository: CarRepository = Depends(get_car_repository),
    owner_repository: CarOwnerRepository = Depends(get_car_owner_repository),
    driver_repository: DriverRepository = Depends(get_driver_repository),
) -> CarService:
    return CarService(repository, owner_repository, driver_repository)


def get_maintenance_service(
    repository: MaintenanceRepository = Depends(get_maintenance_repository),
    car_repository: CarRepository = Depends(get_car_repository),
    payment_repository: PaymentRepository = Depends(get_payment_repository),
) -> MaintenanceService:
    return MaintenanceService(repository, car_repository, payment_repository)


def get_car_doc_service(
    repository: CarDocRepository = Depends(get_car_doc_repository),
    car_repository: CarRepository = Depends(get_car_repository),
    payment_repository: PaymentRepository = Depends(get_payment_repository),
) -> CarDocService:
    return CarDocService(repository, car_repository, payment_repository)


def get_fuel_service(
    repository: FuelRepository = Depends(get_fuel_repository),
    car_repository: CarRepository = Depends(get_car_repository),
    payment_repository: PaymentRepository = Depends(get_payment_repository),
) -> FuelService:
    return FuelService(repository, car_repository, payment_repository)


def get_lease_service(
    repository: LeaseRepository = Depends(get_lease_repository),
    car_repository: CarRepository = Depends(get_car_repository),
    vendor_repository: VendorRepository = Depends(get_vendor_repository),
    car_owner_repository: CarOwnerRepository = Depends(get_car_owner_repository),
    income_repository: IncomeRepository = Depends(get_income_repository),
) -> LeaseService:
    return LeaseService(
        repository, car_repository, vendor_repository, car_owner_repository, income_repository
    )


def get_income_service(
    repository: IncomeRepository = Depends(get_income_repository),
    lease_repository: LeaseRepository = Depends(get_lease_repository),
) -> IncomeService:
    return IncomeService(repository, lease_repository)


def get_payment_service(
    repository: PaymentRepository = Depends(get_payment_repository),
    car_repository: CarRepository = Depends(get_car_repository),
    maintenance_repository: MaintenanceRepository = Depends(get_maintenance_repository),
    car_doc_repository: CarDocRepository = Depends(get_car_doc_repository),
    fuel_repository: FuelRepository = Depends(get_fuel_repository),
) -> PaymentService:
    return PaymentService(
        repository, car_repository, maintenance_repository, car_doc_repository, fuel_repository
    )


def get_revenue_service(
    payment_repository: PaymentRepository = Depends(get_payment_repository),
    income_repository: IncomeRepository = Depends(get_income_repository),
) -> RevenueService:
    return RevenueService(payment_repository, income_repository)
