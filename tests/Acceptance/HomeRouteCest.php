<?php

declare(strict_types=1);

namespace Tests\Acceptance;

use Tests\Support\AcceptanceTester;

final class HomeRouteCest
{
    public function checkType(AcceptanceTester $I)
    {
        $I->amOnPage('/home');
        $I->seeResponseCodeIs(200);
        $I->see('ok');
    }
}
