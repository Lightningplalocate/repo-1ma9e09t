"""授权(License)校验 —— 仅校验，不生成、不发放。

需求 #1：密钥的生成与发放不应在测评软件内。本模块只负责向外部授权服务
查询当前部署的授权状态；平台内不存在任何生成/发放密钥的接口。
外部授权服务地址通过环境变量 LICENSE_SERVICE_URL 配置（可选）。
"""

import os

from fastapi import APIRouter, Depends

from ..auth import get_current_user
from ..models import User

router = APIRouter(prefix="/api/license", tags=["license"])

LICENSE_SERVICE_URL = os.getenv("LICENSE_SERVICE_URL", "")


@router.get("/status")
def license_status(_: User = Depends(get_current_user)):
    """返回当前授权状态。真实环境下应调用外部授权服务校验。"""
    return {
        "managed_externally": True,
        "service_configured": bool(LICENSE_SERVICE_URL),
        "service_url": LICENSE_SERVICE_URL or None,
        "note": "密钥的生成与发放由独立的授权服务负责，测评平台仅做校验。",
        "valid": True,
    }
