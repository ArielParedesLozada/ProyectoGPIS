<?php

namespace App\Enums;

enum RoleType: string
{
    case ADMIN = "admin";
    case COMPRADOR = "comprador";
    case VENDEDOR = "vendedor";
    case MODERADOR = "moderador";
    //Poner los accesos por roles aqui
}
