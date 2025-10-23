<?php

namespace App\Enums;

enum RoleType: string
{
    case SUPER_ADMIN = "super_admin";
    case ADMIN = "admin";
    case MODERADOR = "moderador";
    case VENDEDOR = "vendedor";
    case COMPRADOR = "comprador";
    
    //Poner los accesos por roles aqui
}
