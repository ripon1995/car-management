import uuid

from fastapi import APIRouter, Depends, status

from app.core.dependencies import get_vendor_service
from app.features.auth.dependencies import get_current_user
from app.features.vendors.models import Vendor
from app.features.vendors.schemas import VendorCreate, VendorRead, VendorUpdate
from app.features.vendors.service import VendorService

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[VendorRead])
async def list_vendors(
    service: VendorService = Depends(get_vendor_service),
) -> list[Vendor]:
    return await service.list_all()


@router.post("", response_model=VendorRead, status_code=status.HTTP_201_CREATED)
async def create_vendor(
    payload: VendorCreate, service: VendorService = Depends(get_vendor_service)
) -> Vendor:
    return await service.create(payload)


@router.get("/{vendor_id}", response_model=VendorRead)
async def get_vendor(
    vendor_id: uuid.UUID, service: VendorService = Depends(get_vendor_service)
) -> Vendor:
    return await service.get_by_id(vendor_id)


@router.put("/{vendor_id}", response_model=VendorRead)
async def update_vendor(
    vendor_id: uuid.UUID,
    payload: VendorUpdate,
    service: VendorService = Depends(get_vendor_service),
) -> Vendor:
    return await service.update(vendor_id, payload)


@router.delete("/{vendor_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_vendor(
    vendor_id: uuid.UUID, service: VendorService = Depends(get_vendor_service)
) -> None:
    await service.delete(vendor_id)
